import {
  ALLOWED_ACTION, DomainValidationError, WORKFLOW_STATUSES, assertCurrentVersionBinding,
  validateApprovalSnapshot, validateExceptionCase, validateReviewRecord, validateVersionBinding,
} from "./contracts.ts";
import type { ApprovalSnapshot, ExceptionCase, ExceptionPlan, ReviewRecord, VersionBinding, WorkflowStatus } from "./contracts.ts";
import { assertPlanMatchesPolicy, evaluatePolicy, verifyPolicyCitations } from "./policy.ts";

export const SERVICE_TRANSITIONS: Readonly<Record<WorkflowStatus, readonly WorkflowStatus[]>> = Object.freeze({
  DRAFT: Object.freeze(["ANALYZED"] as const),
  ANALYZED: Object.freeze(["NEEDS_INFO", "BLOCKED", "REVIEWABLE", "NO_ACTION_REQUIRED", "DRAFT"] as const),
  NEEDS_INFO: Object.freeze(["DRAFT"] as const),
  BLOCKED: Object.freeze(["DRAFT"] as const),
  REVIEWABLE: Object.freeze(["APPROVED", "REJECTED", "NEEDS_INFO", "BLOCKED", "DRAFT"] as const),
  APPROVED: Object.freeze(["SUBMITTED", "DRAFT"] as const),
  SUBMITTED: Object.freeze([]),
  REJECTED: Object.freeze(["DRAFT"] as const),
  NO_ACTION_REQUIRED: Object.freeze(["DRAFT"] as const),
});

export function validateWorkflowStatus(raw: unknown): WorkflowStatus {
  if (typeof raw !== "string" || !(WORKFLOW_STATUSES as readonly string[]).includes(raw)) {
    throw new DomainValidationError("Unknown workflow status.", "status");
  }
  return raw as WorkflowStatus;
}

/** S1 structural gate. Authentication, digests and commit/readback evidence must
 * come from the service, never from an unverified client or model response. */
export interface ServiceTransitionEvidence {
  facts?: unknown;
  current_binding?: VersionBinding;
  plan?: ExceptionPlan;
  review?: ReviewRecord;
  approval?: ApprovalSnapshot;
  case_record?: ExceptionCase;
  verified_owner_id?: string;
  explicit_human_confirmation?: boolean;
  current_input_digest?: string;
  current_plan_digest?: string;
  now?: string;
  durable_commit_read_back?: boolean;
}

export interface ServiceTransitionResult {
  status: WorkflowStatus;
  invalidate_derived_records: boolean;
  execution_authorized: false;
}

function checkReviewedPlan(evidence: ServiceTransitionEvidence): { binding: VersionBinding; plan: ExceptionPlan } {
  const binding = validateVersionBinding(evidence.current_binding);
  const plan = assertPlanMatchesPolicy(evidence.plan, evidence.facts);
  assertCurrentVersionBinding(binding, {
    run_id: plan.run_id, owner_id: plan.owner_id, input_version: plan.input_version,
    facts_version: plan.facts_version, policy_version: plan.policy_version,
    plan_id: plan.plan_id, plan_version: plan.plan_version,
  });
  const review = validateReviewRecord(evidence.review);
  assertCurrentVersionBinding(binding, {
    run_id: review.run_id, owner_id: review.owner_id, input_version: review.input_version,
    facts_version: review.facts_version, policy_version: review.policy_version,
    plan_id: review.plan_id, plan_version: review.plan_version,
  });
  if (review.verdict !== "PASS") throw new DomainValidationError("A passing review is required.", "review.verdict", "INVALID_TRANSITION");
  verifyPolicyCitations(review.citations, evaluatePolicy(evidence.facts).citations.map((citation) => citation.clause_id));
  return { binding, plan };
}

function checkApproval(evidence: ServiceTransitionEvidence, binding: VersionBinding): ApprovalSnapshot {
  const approval = validateApprovalSnapshot(evidence.approval);
  assertCurrentVersionBinding(binding, {
    run_id: approval.run_id, owner_id: approval.owner_id, input_version: approval.input_version,
    facts_version: approval.facts_version, policy_version: approval.policy_version,
    plan_id: approval.plan_id, plan_version: approval.plan_version,
  });
  if (evidence.verified_owner_id !== binding.owner_id || evidence.explicit_human_confirmation !== true) {
    throw new DomainValidationError("Current-owner human confirmation must be verified by the service.", "approval", "INVALID_TRANSITION");
  }
  if (evidence.current_input_digest !== approval.input_digest || evidence.current_plan_digest !== approval.plan_digest) {
    throw new DomainValidationError("Approval digests do not match the current input and plan.", "approval", "STALE_VERSION");
  }
  return approval;
}

/** Validates a service-side transition; it does not persist state or execute an action. */
export function transitionWorkflow(fromRaw: unknown, toRaw: unknown, evidence: ServiceTransitionEvidence = {}): ServiceTransitionResult {
  const from = validateWorkflowStatus(fromRaw);
  const to = validateWorkflowStatus(toRaw);
  if (!SERVICE_TRANSITIONS[from].includes(to)) throw new DomainValidationError(`Transition ${from} -> ${to} is not allowed.`, "status", "INVALID_TRANSITION");
  if (to === "NEEDS_INFO" || to === "BLOCKED" || to === "NO_ACTION_REQUIRED") {
    const decision = evaluatePolicy(evidence.facts);
    // A review may block a valid recommendation, but can never make blocked facts eligible.
    const review = evidence.review === undefined ? null : validateReviewRecord(evidence.review);
    if (review) {
      const binding = validateVersionBinding(evidence.current_binding);
      assertCurrentVersionBinding(binding, {
        run_id: review.run_id, owner_id: review.owner_id, input_version: review.input_version,
        facts_version: review.facts_version, policy_version: review.policy_version,
        plan_id: review.plan_id, plan_version: review.plan_version,
      });
      verifyPolicyCitations(review.citations);
    }
    const reviewCanBlock = (to === "BLOCKED" || to === "NEEDS_INFO") && review?.verdict === to;
    if (decision.status !== to && !reviewCanBlock) throw new DomainValidationError("Target status is not supported by the deterministic decision or review.", "status", "INVALID_TRANSITION");
  }
  if (to === "REVIEWABLE" || to === "APPROVED" || to === "SUBMITTED") {
    const { binding, plan } = checkReviewedPlan(evidence);
    if (to === "APPROVED" || to === "SUBMITTED") {
      const approval = checkApproval(evidence, binding);
      const now = typeof evidence.now === "string" ? Date.parse(evidence.now) : Number.NaN;
      if (to === "APPROVED" && (!Number.isFinite(now) || now < Date.parse(approval.approved_at) || now >= Date.parse(approval.expires_at))) {
        throw new DomainValidationError("Approval is not currently valid.", "approval.expires_at", "STALE_VERSION");
      }
      if (to === "SUBMITTED") {
        const record = validateExceptionCase(evidence.case_record);
        assertCurrentVersionBinding(binding, {
          run_id: record.run_id, owner_id: record.owner_id, input_version: record.input_version,
          facts_version: record.facts_version, policy_version: record.policy_version,
          plan_id: record.plan_id, plan_version: record.plan_version,
        });
        if (record.approval_id !== approval.approval_id || record.action !== ALLOWED_ACTION || evidence.durable_commit_read_back !== true) {
          throw new DomainValidationError("Submitted status requires the matching committed case and readback.", "case", "INVALID_TRANSITION");
        }
        for (const key of ["case_type", "employee_identifier", "amount_minor", "currency", "receipt_status", "description"] as const) {
          if (record[key] !== plan.proposed_case[key]) throw new DomainValidationError("Committed case differs from the reviewed plan.", key, "POLICY_MISMATCH");
        }
        if (JSON.stringify(record.evidence_requirements) !== JSON.stringify(plan.proposed_case.evidence_requirements)) {
          throw new DomainValidationError("Committed case evidence differs from the reviewed plan.", "evidence_requirements", "POLICY_MISMATCH");
        }
        verifyPolicyCitations(record.citations, plan.citations.map((citation) => citation.clause_id));
        // Recovery validates the trusted commit time, not whether approval is
        // still live at readback. This cannot authorize a new write after expiry.
        const createdAt = Date.parse(record.created_at);
        if (!Number.isFinite(now) || createdAt < Date.parse(approval.approved_at) || createdAt >= Date.parse(approval.expires_at) || now < createdAt) {
          throw new DomainValidationError("Case creation time is outside approval validity or the readback interval.", "case.created_at", "INVALID_TRANSITION");
        }
      }
    }
  }
  return { status: to, invalidate_derived_records: to === "DRAFT", execution_authorized: false };
}
