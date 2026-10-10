import { createHash, randomUUID } from "node:crypto";
import type { DocumentData, Firestore } from "firebase-admin/firestore";
import {
  ALLOWED_ACTION, BINDING_FIELDS, CONTRACT_VERSIONS, DomainValidationError,
  assertCurrentVersionBinding, validateApprovalSnapshot, validateExceptionCase,
  validateExpenseFacts, validateReviewRecord, validateVersionBinding,
} from "../src/domain/contracts.ts";
import type { ApprovalSnapshot, ExceptionCase, ExceptionPlan, VersionBinding } from "../src/domain/contracts.ts";
import { assertPlanMatchesPolicy, evaluatePolicy, verifyPolicyCitations } from "../src/domain/policy.ts";
import type { WorkflowResponse } from "./planning-contracts.ts";

export type RecordKind = "runs" | "heads" | "confirmations" | "approvals" | "cases" | "audit" | "idempotency";
export interface CaseTransaction {
  get<T>(kind: RecordKind, id: string): Promise<T | null>;
  set<T>(kind: RecordKind, id: string, value: T): void;
}
export interface CaseStore {
  get<T>(kind: RecordKind, id: string): Promise<T | null>;
  list<T>(kind: RecordKind, ownerId: string): Promise<T[]>;
  runTransaction<T>(operation: (transaction: CaseTransaction) => Promise<T>): Promise<T>;
}

/** The browser never receives this Admin Firestore instance. Every query is owner scoped. */
export class FirestoreCaseStore implements CaseStore {
  private readonly firestore: Firestore;
  private readonly namespace: string;
  constructor(firestore: Firestore, namespace = "opscrew_s3") {
    if (!/^[a-z][a-z0-9_]{0,60}$/.test(namespace)) throw new Error("Invalid case storage namespace.");
    this.firestore = firestore; this.namespace = namespace;
  }
  private ref(kind: RecordKind, id: string) { return this.firestore.collection(`${this.namespace}_${kind}`).doc(id); }
  async get<T>(kind: RecordKind, id: string): Promise<T | null> {
    const snapshot = await this.ref(kind, id).get();
    return snapshot.exists ? snapshot.data() as T : null;
  }
  async list<T>(kind: RecordKind, ownerId: string): Promise<T[]> {
    const query = this.firestore.collection(`${this.namespace}_${kind}`).where("owner_id", "==", ownerId);
    const snapshot = await (kind === "runs" || kind === "cases" ? query.orderBy("created_at", "desc") : query).limit(100).get();
    return snapshot.docs.map((document) => document.data() as T);
  }
  runTransaction<T>(operation: (transaction: CaseTransaction) => Promise<T>): Promise<T> {
    return this.firestore.runTransaction(async (transaction) => operation({
      get: async <R>(kind: RecordKind, id: string) => {
        const snapshot = await transaction.get(this.ref(kind, id));
        return snapshot.exists ? snapshot.data() as R : null;
      },
      set: <R>(kind: RecordKind, id: string, value: R) => { transaction.set(this.ref(kind, id), value as DocumentData); },
    }));
  }
}

/** An atomic, serializable offline test adapter. It is never a runtime fallback. */
export class MemoryCaseStore implements CaseStore {
  private documents = new Map<string, unknown>();
  private queue: Promise<void> = Promise.resolve();
  async get<T>(kind: RecordKind, id: string): Promise<T | null> {
    return structuredClone(this.documents.get(`${kind}/${id}`) ?? null) as T | null;
  }
  async list<T>(kind: RecordKind, ownerId: string): Promise<T[]> {
    return [...this.documents.entries()].filter(([key, value]) => key.startsWith(`${kind}/`) && (value as {owner_id?: string}).owner_id === ownerId).map(([, value]) => structuredClone(value) as T);
  }
  async runTransaction<T>(operation: (transaction: CaseTransaction) => Promise<T>): Promise<T> {
    let release!: () => void;
    const previous = this.queue;
    this.queue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    const writes = new Map<string, unknown>();
    try {
      const result = await operation({
        get: async <R>(kind: RecordKind, id: string) => structuredClone(writes.get(`${kind}/${id}`) ?? this.documents.get(`${kind}/${id}`) ?? null) as R | null,
        set: <R>(kind: RecordKind, id: string, value: R) => { writes.set(`${kind}/${id}`, structuredClone(value)); },
      });
      for (const [key, value] of writes) this.documents.set(key, value);
      return result;
    } finally { release(); }
  }
}

export class CaseServiceError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status = 400) { super(message); this.name = "CaseServiceError"; this.code = code; this.status = status; }
}
export interface DurableRun {
  schema_version: "1.0.0";
  run_id: string;
  owner_id: string;
  input_version: number;
  status: "DRAFT" | "ERROR" | "REVIEWABLE" | "NEEDS_INFO" | "BLOCKED" | "NO_ACTION_REQUIRED" | "REJECTED" | "INVALIDATED" | "SUBMITTED";
  input: Record<string, unknown>;
  workflow_response: WorkflowResponse | null;
  case_id: string | null;
  created_at: string;
  updated_at: string;
}
interface CurrentHead { owner_id: string; run_id: string; input_version: number }
export interface ConfirmationIntent {
  approval_id: string;
  binding: VersionBinding;
  owner_id: string;
  action: typeof ALLOWED_ACTION;
  input_digest: string;
  plan_digest: string;
  prepared_at: string;
  expires_at: string;
}
export interface ConfirmCommand {
  approval_id: string;
  binding: VersionBinding;
  idempotency_key: string;
  confirmed: true;
}
export interface ConfirmResult { case_id: string; approval_id: string; committed: true; replayed: boolean }
interface IdempotencyRecord { owner_id: string; request_digest: string; case_id: string; approval_id: string; committed_at: string }
interface AuditEvent { owner_id: string; event: string; run_id: string; case_id: string | null; approval_id: string | null; created_at: string; binding?: VersionBinding; action?: typeof ALLOWED_ACTION }

/** Stable semantic hashing; no insertion-order dependence for object keys. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  throw new CaseServiceError("INVALID_PAYLOAD", "Only finite JSON values can be persisted.");
}
export function sha256(value: unknown): string { return createHash("sha256").update(canonicalJson(value)).digest("hex"); }
export function projectBinding(record: VersionBinding): VersionBinding {
  return validateVersionBinding(Object.fromEntries(BINDING_FIELDS.map((field) => [field, record[field]])));
}
function safeId(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_.:-]{1,128}$/.test(value)) throw new CaseServiceError("INVALID_REQUEST", `${label} is invalid.`);
  return value;
}
function ownerId(value: string): string {
  if (typeof value !== "string" || !value || value.length > 128) throw new CaseServiceError("UNAUTHENTICATED", "A verified session is required.", 401);
  return value;
}
function assertOwner(value: { owner_id: string } | null, uid: string): asserts value is { owner_id: string } {
  // A missing record and someone else's record reveal the same result.
  if (!value || value.owner_id !== uid) throw new CaseServiceError("NOT_FOUND", "The owned record was not found.", 404);
}
function assertBinding(current: VersionBinding, candidate: VersionBinding): void {
  try { assertCurrentVersionBinding(projectBinding(current), projectBinding(candidate)); }
  catch (error) { if (error instanceof DomainValidationError) throw new CaseServiceError("STALE_VERSION", "The plan is no longer current. Analyze and review the input again.", 409); throw error; }
}

export class CaseService {
  readonly store: CaseStore;
  private readonly now: () => number;
  private readonly id: () => string;
  private readonly approvalTtlMs: number;
  constructor(options: {store: CaseStore; now?: () => number; id?: () => string; approvalTtlMs?: number}) {
    this.store = options.store; this.now = options.now ?? Date.now; this.id = options.id ?? randomUUID;
    this.approvalTtlMs = options.approvalTtlMs ?? 10 * 60_000;
    if (!Number.isSafeInteger(this.approvalTtlMs) || this.approvalTtlMs < 1 || this.approvalTtlMs > 30 * 60_000) throw new Error("Invalid confirmation expiry.");
  }
  private timestamp() { return new Date(this.now()).toISOString(); }
  private headId(uid: string) { return sha256({uid}); }
  private async assertCurrent(transaction: CaseTransaction, uid: string, run: DurableRun) {
    const head = await transaction.get<CurrentHead>("heads", this.headId(uid));
    if (!head || head.owner_id !== uid || head.run_id !== run.run_id || head.input_version !== run.input_version) throw new CaseServiceError("STALE_VERSION", "A newer input has replaced this plan.", 409);
  }
  private reviewable(run: DurableRun, candidate?: VersionBinding, allowCommitted = false): {plan: ExceptionPlan; binding: VersionBinding} {
    if (!(run.status === "REVIEWABLE" || allowCommitted && run.status === "SUBMITTED") || !run.workflow_response?.ok || !run.workflow_response.facts || !run.workflow_response.workflow?.plan || !run.workflow_response.workflow.review) throw new CaseServiceError("PLAN_NOT_REVIEWABLE", "This run has no current passing plan to confirm.", 409);
    const workflow = run.workflow_response.workflow;
    const facts = validateExpenseFacts(run.workflow_response.facts);
    const plan = assertPlanMatchesPolicy(workflow.plan, facts);
    const review = validateReviewRecord(workflow.review);
    const binding = projectBinding(plan);
    if (binding.owner_id !== run.owner_id || binding.run_id !== run.run_id || binding.input_version !== run.input_version) throw new CaseServiceError("STALE_VERSION", "Stored plan ownership or version is invalid.", 409);
    assertBinding(binding, workflow.binding); assertBinding(binding, review);
    if (candidate) assertBinding(binding, candidate);
    if (workflow.status !== "REVIEWABLE" || workflow.execution_authorized !== false || review.verdict !== "PASS" || review.issues.length > 0) throw new CaseServiceError("REVIEW_FAILED", "A current passing review is required before confirmation.", 409);
    const decision = evaluatePolicy(facts);
    const required = decision.citations.map((citation) => citation.clause_id);
    verifyPolicyCitations(plan.citations, required); verifyPolicyCitations(review.citations, required);
    if (plan.citations.length !== required.length || review.citations.length !== required.length) throw new CaseServiceError("POLICY_BLOCKED", "The review citations do not match the applicable policy clauses.", 409);
    if (!decision.case_eligible || decision.allowed_action !== ALLOWED_ACTION) throw new CaseServiceError("POLICY_BLOCKED", "The deterministic policy does not allow case creation.", 409);
    return {plan, binding};
  }
  async createRun(uid: string, intake: Record<string, unknown>, requestedInputVersion = 1): Promise<DurableRun> {
    ownerId(uid);
    if (!Number.isSafeInteger(requestedInputVersion) || requestedInputVersion < 1) throw new CaseServiceError("INVALID_INPUT_VERSION", "Input version must be a positive safe integer.");
    // Root validates the intake before creating a run. Persistence independently bounds JSON size.
    const input = JSON.parse(canonicalJson(intake)) as Record<string, unknown>;
    if (Buffer.byteLength(canonicalJson(input), "utf8") > 24_000) throw new CaseServiceError("INPUT_TOO_LARGE", "The synthetic input is too large.", 413);
    const runId = safeId(this.id(), "run_id"), timestamp = this.timestamp();
    return this.store.runTransaction(async (transaction) => {
      const head = await transaction.get<CurrentHead>("heads", this.headId(uid));
      const inputVersion = (head?.input_version ?? 0) + 1;
      if (!Number.isSafeInteger(inputVersion)) throw new CaseServiceError("VERSION_EXHAUSTED", "A new session is required.", 409);
      const run: DurableRun = { schema_version: "1.0.0", run_id: runId, owner_id: uid, input_version: inputVersion, status: "DRAFT", input, workflow_response: null, case_id: null, created_at: timestamp, updated_at: timestamp };
      transaction.set("runs", runId, run); transaction.set("heads", this.headId(uid), {owner_id: uid, run_id: runId, input_version: inputVersion});
      return run;
    });
  }
  async completeRun(uid: string, runId: string, result: WorkflowResponse): Promise<WorkflowResponse> {
    ownerId(uid); safeId(runId, "run_id");
    const planId = `plan_${safeId(this.id(), "plan_id")}`;
    return this.store.runTransaction(async (transaction) => {
      const run = await transaction.get<DurableRun>("runs", runId); assertOwner(run, uid);
      await this.assertCurrent(transaction, uid, run);
      if (run.status !== "DRAFT") throw new CaseServiceError("STALE_VERSION", "This analysis was cancelled or already completed.", 409);
      const response = structuredClone(result);
      response.run_id = runId;
      if (response.workflow) {
        const binding: VersionBinding = {...projectBinding(response.workflow.binding), owner_id: uid, run_id: runId, input_version: run.input_version, facts_version: 1, plan_id: planId, plan_version: 1};
        response.workflow.binding = binding;
        if (response.workflow.plan) response.workflow.plan = {...response.workflow.plan, ...binding};
        if (response.workflow.review) response.workflow.review = {...response.workflow.review, ...binding};
      }
      if (Buffer.byteLength(canonicalJson(response), "utf8") > 180_000) throw new CaseServiceError("RESULT_TOO_LARGE", "The workflow result is too large to persist.", 502);
      const status = response.ok && response.workflow ? response.workflow.status : "ERROR";
      const completed: DurableRun = {...run, status, workflow_response: response, updated_at: this.timestamp()};
      if (status === "REVIEWABLE") this.reviewable(completed);
      transaction.set("runs", runId, completed);
      return response;
    });
  }
  async cancelRun(uid: string, runId: string): Promise<void> {
    ownerId(uid); safeId(runId, "run_id");
    await this.store.runTransaction(async (transaction) => {
      const run = await transaction.get<DurableRun>("runs", runId); assertOwner(run, uid);
      // Completion may commit just before the disconnect cancellation reaches storage.
      // Invalidate every unconfirmed result; committed cases remain durable and recoverable.
      if (["SUBMITTED", "REJECTED", "INVALIDATED"].includes(run.status)) return;
      transaction.set("runs", runId, {...run, status: "INVALIDATED", updated_at: this.timestamp()});
    });
  }
  async getRun(uid: string, runId: string): Promise<DurableRun> {
    ownerId(uid); safeId(runId, "run_id");
    const run = await this.store.get<DurableRun>("runs", runId); assertOwner(run, uid); return run;
  }
  async listRuns(uid: string): Promise<DurableRun[]> {
    ownerId(uid); return (await this.store.list<DurableRun>("runs", uid)).sort((a,b) => b.created_at.localeCompare(a.created_at));
  }
  async prepareConfirmation(uid: string, runId: string, candidate: VersionBinding): Promise<ConfirmationIntent> {
    ownerId(uid); safeId(runId, "run_id"); const binding = validateVersionBinding(candidate);
    if (binding.owner_id !== uid || binding.run_id !== runId) throw new CaseServiceError("NOT_FOUND", "The owned record was not found.", 404);
    const approvalId = `approval_${safeId(this.id(), "approval_id")}`;
    return this.store.runTransaction(async (transaction) => {
      const run = await transaction.get<DurableRun>("runs", runId); assertOwner(run, uid);
      await this.assertCurrent(transaction, uid, run);
      const current = this.reviewable(run, binding);
      const now = this.now();
      const intent: ConfirmationIntent = {approval_id: approvalId, binding: current.binding, owner_id: uid, action: ALLOWED_ACTION, input_digest: sha256(run.input), plan_digest: sha256(current.plan), prepared_at: new Date(now).toISOString(), expires_at: new Date(now + this.approvalTtlMs).toISOString()};
      transaction.set("confirmations", approvalId, intent); return intent;
    });
  }
  async confirm(uid: string, command: ConfirmCommand): Promise<ConfirmResult> {
    ownerId(uid); const approvalId = safeId(command.approval_id, "approval_id");
    const binding = validateVersionBinding(command.binding);
    const key = safeId(command.idempotency_key, "idempotency_key");
    if (key.length < 8 || command.confirmed !== true) throw new CaseServiceError("CONFIRMATION_REQUIRED", "Explicit human confirmation and a stable idempotency key are required.");
    if (binding.owner_id !== uid) throw new CaseServiceError("NOT_FOUND", "The owned record was not found.", 404);
    const requestDigest = sha256({approval_id: approvalId, binding, confirmed: true});
    const idempotencyId = sha256({uid, key});
    const caseId = `case_${sha256({uid, plan_id: binding.plan_id, plan_version: binding.plan_version, action: ALLOWED_ACTION})}`;
    return this.store.runTransaction(async (transaction) => {
      // All reads precede writes, including replay recovery. Gemini is never called here.
      const intent = await transaction.get<ConfirmationIntent>("confirmations", approvalId);
      const run = await transaction.get<DurableRun>("runs", binding.run_id);
      const previous = await transaction.get<IdempotencyRecord>("idempotency", idempotencyId);
      const existing = await transaction.get<ExceptionCase>("cases", caseId);
      assertOwner(intent, uid); assertOwner(run, uid); assertBinding(intent.binding, binding);
      if (previous && (previous.owner_id !== uid || previous.request_digest !== requestDigest || previous.case_id !== caseId)) throw new CaseServiceError("IDEMPOTENCY_CONFLICT", "This idempotency key was used with a different command.", 409);
      if (existing) {
        assertOwner(existing, uid); assertBinding(existing, binding);
        const approval = await transaction.get<ApprovalSnapshot>("approvals", existing.approval_id);
        assertOwner(approval, uid);
        const validApproval = validateApprovalSnapshot(approval);
        assertBinding(existing, validApproval);
        if (validApproval.input_digest !== intent.input_digest || validApproval.plan_digest !== intent.plan_digest || validApproval.action !== ALLOWED_ACTION) throw new CaseServiceError("STORAGE_INCONSISTENT", "The committed case did not match the confirmation.", 503);
        validateExceptionCase(existing);
        // A valid committed command remains recoverable after expiry or a later input edit.
        transaction.set("idempotency", idempotencyId, {owner_id: uid, request_digest: requestDigest, case_id: caseId, approval_id: existing.approval_id, committed_at: existing.created_at});
        return {case_id: caseId, approval_id: existing.approval_id, committed: true, replayed: true};
      }
      if (previous) throw new CaseServiceError("STORAGE_INCONSISTENT", "The committed result could not be independently located.", 503);
      await this.assertCurrent(transaction, uid, run);
      const current = this.reviewable(run, binding);
      const now = this.now();
      if (now < Date.parse(intent.prepared_at) || now >= Date.parse(intent.expires_at)) throw new CaseServiceError("CONFIRMATION_EXPIRED", "The confirmation expired. Review and prepare it again.", 409);
      if (intent.input_digest !== sha256(run.input) || intent.plan_digest !== sha256(current.plan)) throw new CaseServiceError("STALE_VERSION", "The input or plan changed after confirmation was prepared.", 409);
      const timestamp = new Date(now).toISOString();
      const approval = validateApprovalSnapshot({schema_version: CONTRACT_VERSIONS.approval, ...binding, approval_id: approvalId, action: ALLOWED_ACTION, input_digest: intent.input_digest, plan_digest: intent.plan_digest, approved_at: timestamp, expires_at: intent.expires_at});
      const exceptionCase = validateExceptionCase({schema_version: CONTRACT_VERSIONS.case, ...binding, ...current.plan.proposed_case, case_id: caseId, approval_id: approvalId, action: ALLOWED_ACTION, status: "OPEN", synthetic: true, citations: current.plan.citations, created_at: timestamp});
      const audit: AuditEvent = {owner_id: uid, event: "CASE_CREATED", run_id: run.run_id, case_id: caseId, approval_id: approvalId, created_at: timestamp, binding, action: ALLOWED_ACTION};
      transaction.set("approvals", approvalId, approval);
      transaction.set("cases", caseId, exceptionCase);
      transaction.set("audit", caseId, audit);
      transaction.set("idempotency", idempotencyId, {owner_id: uid, request_digest: requestDigest, case_id: caseId, approval_id: approvalId, committed_at: timestamp});
      transaction.set("runs", run.run_id, {...run, status: "SUBMITTED", case_id: caseId, updated_at: timestamp});
      return {case_id: caseId, approval_id: approvalId, committed: true, replayed: false};
    });
  }
  async recover(uid: string, command: ConfirmCommand): Promise<ConfirmResult> {
    ownerId(uid); const approvalId = safeId(command.approval_id, "approval_id");
    const binding = validateVersionBinding(command.binding);
    const key = safeId(command.idempotency_key, "idempotency_key");
    if (key.length < 8 || command.confirmed !== true) throw new CaseServiceError("CONFIRMATION_REQUIRED", "A previously confirmed command and its original idempotency key are required.");
    if (binding.owner_id !== uid) throw new CaseServiceError("NOT_FOUND", "The owned record was not found.", 404);
    const requestDigest = sha256({approval_id: approvalId, binding, confirmed: true});
    const idempotencyId = sha256({uid, key});
    const caseId = `case_${sha256({uid, plan_id: binding.plan_id, plan_version: binding.plan_version, action: ALLOWED_ACTION})}`;
    const [intent, previous, existing] = await Promise.all([
      this.store.get<ConfirmationIntent>("confirmations", approvalId),
      this.store.get<IdempotencyRecord>("idempotency", idempotencyId),
      this.store.get<ExceptionCase>("cases", caseId),
    ]);
    assertOwner(intent, uid); assertBinding(intent.binding, binding);
    if (previous && (previous.owner_id !== uid || previous.request_digest !== requestDigest || previous.case_id !== caseId)) throw new CaseServiceError("IDEMPOTENCY_CONFLICT", "This idempotency key was used with a different command.", 409);
    if (!existing) {
      if (previous) throw new CaseServiceError("STORAGE_INCONSISTENT", "The committed result could not be independently located.", 503);
      throw new CaseServiceError("CASE_NOT_COMMITTED", "No committed case was located by this read. No case was created; a submission still in progress may need another history check.", 404);
    }
    assertOwner(existing, uid); assertBinding(existing, binding);
    const approval = await this.store.get<ApprovalSnapshot>("approvals", existing.approval_id); assertOwner(approval, uid);
    const validApproval = validateApprovalSnapshot(approval); assertBinding(existing, validApproval);
    if (validApproval.input_digest !== intent.input_digest || validApproval.plan_digest !== intent.plan_digest || validApproval.action !== ALLOWED_ACTION) throw new CaseServiceError("STORAGE_INCONSISTENT", "The committed case did not match the original confirmation.", 503);
    await this.readCase(uid, caseId);
    // No transaction or set call occurs in read-only recovery, including distinct-key lookup.
    return {case_id: caseId, approval_id: existing.approval_id, committed: true, replayed: true};
  }
  async readCase(uid: string, caseId: string): Promise<ExceptionCase> {
    ownerId(uid); safeId(caseId, "case_id");
    // These are independent reads after commit, not values returned by the transaction.
    const record = await this.store.get<ExceptionCase>("cases", caseId); assertOwner(record, uid);
    const approval = await this.store.get<ApprovalSnapshot>("approvals", record.approval_id); assertOwner(approval, uid);
    const run = await this.store.get<DurableRun>("runs", record.run_id); assertOwner(run, uid);
    const audit = await this.store.get<AuditEvent>("audit", caseId);
    if (!audit || audit.owner_id !== uid || audit.event !== "CASE_CREATED" || audit.case_id !== caseId || audit.run_id !== record.run_id || audit.approval_id !== record.approval_id || audit.created_at !== record.created_at || audit.action !== ALLOWED_ACTION || !audit.binding) throw new CaseServiceError("STORAGE_INCONSISTENT", "The stored case has no matching successful audit event.", 503);
    const exceptionCase = validateExceptionCase(record), validApproval = validateApprovalSnapshot(approval);
    assertBinding(exceptionCase, validApproval); assertBinding(exceptionCase, audit.binding); verifyPolicyCitations(exceptionCase.citations);
    const source = this.reviewable(run, projectBinding(exceptionCase), true);
    if (run.case_id !== caseId || validApproval.input_digest !== sha256(run.input) || validApproval.plan_digest !== sha256(source.plan)) throw new CaseServiceError("STORAGE_INCONSISTENT", "The stored case no longer matches its confirmed input and plan.", 503);
    for (const key of ["case_type", "employee_identifier", "amount_minor", "currency", "receipt_status", "description", "evidence_requirements"] as const) {
      if (canonicalJson(exceptionCase[key]) !== canonicalJson(source.plan.proposed_case[key])) throw new CaseServiceError("STORAGE_INCONSISTENT", "The stored case fields differ from the confirmed plan.", 503);
    }
    if (exceptionCase.created_at !== validApproval.approved_at || Date.parse(validApproval.approved_at) >= Date.parse(validApproval.expires_at)) throw new CaseServiceError("STORAGE_INCONSISTENT", "The stored confirmation is inconsistent with the case.", 503);
    // Delayed readback does not retroactively expire a valid transaction.
    return exceptionCase;
  }
  async listCases(uid: string): Promise<ExceptionCase[]> {
    ownerId(uid);
    const records = await this.store.list<ExceptionCase>("cases", uid);
    return records.map((record) => validateExceptionCase(record)).sort((a,b) => b.created_at.localeCompare(a.created_at));
  }
  async markRun(uid: string, runId: string, candidate: VersionBinding, status: "REJECTED" | "INVALIDATED"): Promise<DurableRun> {
    ownerId(uid); safeId(runId, "run_id"); const binding = validateVersionBinding(candidate);
    if (binding.owner_id !== uid || binding.run_id !== runId) throw new CaseServiceError("NOT_FOUND", "The owned record was not found.", 404);
    return this.store.runTransaction(async (transaction) => {
      const run = await transaction.get<DurableRun>("runs", runId); assertOwner(run, uid);
      await this.assertCurrent(transaction, uid, run);
      if (run.status === "SUBMITTED") throw new CaseServiceError("ALREADY_COMMITTED", "The case is already committed and can be read from history.", 409);
      if (!run.workflow_response?.workflow?.binding) throw new CaseServiceError("PLAN_NOT_REVIEWABLE", "The run has no completed version binding.", 409);
      assertBinding(run.workflow_response.workflow.binding, binding);
      const timestamp = this.timestamp();
      const updated: DurableRun = {...run, status, updated_at: timestamp};
      transaction.set("runs", runId, updated);
      transaction.set("audit", `${status.toLowerCase()}_${runId}`, {owner_id: uid, event: status, run_id: runId, case_id: null, approval_id: null, created_at: timestamp});
      return updated;
    });
  }
}
