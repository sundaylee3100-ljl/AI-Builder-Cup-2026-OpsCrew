import type { ValidatedExpenseFacts } from "../../server.ts";

export const CONTRACT_VERSIONS = Object.freeze({
  facts: "1.0.0",
  decision: "1.0.0",
  plan: "1.0.0",
  review: "1.0.0",
  approval: "1.0.0",
  case: "1.0.0",
  workflow: "1.0.0",
  error: "1.0.0",
} as const);
export const POLICY_VERSION = "synthetic-expense-usd-1.0.0" as const;
export const ALLOWED_ACTION = "create_exception_case" as const;
export type AllowedAction = typeof ALLOWED_ACTION;

// Type-only compatibility with the existing validated extraction contract.
// This module neither loads the server nor starts model calls or a web server.
export type ExpenseFacts = ValidatedExpenseFacts;
export type ReceiptStatus = ExpenseFacts["receipt_status"];
export type CaseType = "EVIDENCE_REQUEST" | "MANUAL_REVIEW";
export type PolicyBranch = CaseType | "NEEDS_INFO" | "BLOCKED" | "NO_ACTION_REQUIRED";
export const WORKFLOW_STATUSES = Object.freeze([
  "DRAFT", "ANALYZED", "NEEDS_INFO", "BLOCKED", "REVIEWABLE", "APPROVED",
  "SUBMITTED", "REJECTED", "NO_ACTION_REQUIRED",
] as const);
export type WorkflowStatus = typeof WORKFLOW_STATUSES[number];

export interface PolicyCitation {
  clause_id: string;
  policy_version: typeof POLICY_VERSION;
  original_text: string;
}

export interface PolicyDecision {
  schema_version: typeof CONTRACT_VERSIONS.decision;
  policy_version: typeof POLICY_VERSION;
  branch: PolicyBranch;
  status: "NEEDS_INFO" | "BLOCKED" | "REVIEWABLE" | "NO_ACTION_REQUIRED";
  case_eligible: boolean;
  allowed_action: AllowedAction | null;
  execution_authorized: false;
  required_information: Array<"amount_minor" | "employee_identifier" | "receipt_status">;
  blockers: string[];
  evidence_requirements: string[];
  citations: PolicyCitation[];
  summary: string;
}

export interface FactSnapshot {
  schema_version: typeof CONTRACT_VERSIONS.facts;
  run_id: string;
  owner_id: string;
  input_version: number;
  facts_version: number;
  facts: ExpenseFacts;
}

export interface VersionBinding {
  run_id: string;
  owner_id: string;
  input_version: number;
  facts_version: number;
  policy_version: typeof POLICY_VERSION;
  plan_id: string;
  plan_version: number;
}

export interface ProposedCase {
  case_type: CaseType;
  employee_identifier: string;
  amount_minor: number;
  currency: "USD";
  receipt_status: "available" | "missing";
  description: string | null;
  evidence_requirements: string[];
}

export interface ExceptionPlan extends VersionBinding {
  schema_version: typeof CONTRACT_VERSIONS.plan;
  action: AllowedAction;
  proposed_case: ProposedCase;
  citations: PolicyCitation[];
  rationale: string;
}

export interface ReviewRecord extends VersionBinding {
  schema_version: typeof CONTRACT_VERSIONS.review;
  review_id: string;
  verdict: "PASS" | "NEEDS_INFO" | "BLOCKED";
  issues: string[];
  citations: PolicyCitation[];
  reviewed_at: string;
}

export interface ApprovalSnapshot extends VersionBinding {
  schema_version: typeof CONTRACT_VERSIONS.approval;
  approval_id: string;
  action: AllowedAction;
  input_digest: string;
  plan_digest: string;
  approved_at: string;
  expires_at: string;
}

export interface ExceptionCase extends VersionBinding, ProposedCase {
  schema_version: typeof CONTRACT_VERSIONS.case;
  case_id: string;
  approval_id: string;
  action: AllowedAction;
  status: "OPEN";
  synthetic: true;
  citations: PolicyCitation[];
  created_at: string;
}

export interface DomainErrorBody {
  schema_version: typeof CONTRACT_VERSIONS.error;
  code: "INVALID_CONTRACT" | "STALE_VERSION" | "INVALID_TRANSITION" | "POLICY_MISMATCH";
  message: string;
  field: string | null;
}

export class DomainValidationError extends Error {
  readonly code: DomainErrorBody["code"];
  readonly field: string | null;

  constructor(message: string, field: string | null = null, code: DomainErrorBody["code"] = "INVALID_CONTRACT") {
    super(message);
    this.name = "DomainValidationError";
    this.code = code;
    this.field = field;
  }

  toJSON(): DomainErrorBody {
    return { schema_version: CONTRACT_VERSIONS.error, code: this.code, message: this.message, field: this.field };
  }
}

export function requireRecord(raw: unknown, fields: readonly string[], label: string): Record<string, unknown> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new DomainValidationError(`${label} must be an object.`, label);
  }
  const record = raw as Record<string, unknown>;
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(record, field) || record[field] === undefined) {
      throw new DomainValidationError(`${label}.${field} must be explicitly present.`, `${label}.${field}`);
    }
  }
  for (const field of Object.keys(record)) {
    if (!fields.includes(field)) {
      throw new DomainValidationError(`${label}.${field} is not an allowed field.`, `${label}.${field}`);
    }
  }
  return record;
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new DomainValidationError(`${field} must be a non-empty string.`, field);
  }
  return value.trim();
}

export function requireStrings(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw new DomainValidationError(`${field} must be an array of strings.`, field);
  return value.map((item, index) => requireString(item, `${field}[${index}]`));
}

function requireVersion(value: unknown, expected: string, field: string): void {
  if (value !== expected) throw new DomainValidationError(`${field} must be '${expected}'.`, field, "STALE_VERSION");
}

function requirePositiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new DomainValidationError(`${field} must be a positive safe integer.`, field);
  }
  return value;
}

function requireAmount(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new DomainValidationError(`${field} must be a non-negative safe integer in USD cents.`, field);
  }
  return value;
}

function nullableText(value: unknown, field: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string") throw new DomainValidationError(`${field} must be a string or null.`, field);
  const trimmed = value.trim();
  return !trimmed || /^(?:unknown|null|none|n\/a|not provided)$/i.test(trimmed) ? null : trimmed;
}

function requireTimestamp(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new DomainValidationError(`${field} must be a UTC ISO timestamp.`, field);
  }
  const canonical = new Date(value).toISOString();
  if (canonical !== value && canonical !== value.replace(/Z$/, ".000Z")) {
    throw new DomainValidationError(`${field} must be a valid calendar timestamp.`, field);
  }
  return value;
}

const FACT_FIELDS = ["amount_minor", "currency", "receipt_status", "description", "employee_identifier", "missing_information", "contradictions"] as const;
export function validateExpenseFacts(raw: unknown): ExpenseFacts {
  const value = requireRecord(raw, FACT_FIELDS, "facts");
  if (value.currency !== "USD") throw new DomainValidationError("facts.currency must be 'USD'.", "facts.currency");
  if (!["available", "missing", "unknown"].includes(value.receipt_status as string)) {
    throw new DomainValidationError("facts.receipt_status must be available, missing, or unknown.", "facts.receipt_status");
  }
  return {
    amount_minor: value.amount_minor === null ? null : requireAmount(value.amount_minor, "facts.amount_minor"),
    currency: "USD",
    receipt_status: value.receipt_status as ReceiptStatus,
    description: nullableText(value.description, "facts.description"),
    employee_identifier: nullableText(value.employee_identifier, "facts.employee_identifier"),
    missing_information: requireStrings(value.missing_information, "facts.missing_information"),
    contradictions: requireStrings(value.contradictions, "facts.contradictions"),
  };
}

export function validateFactSnapshot(raw: unknown): FactSnapshot {
  const value = requireRecord(raw, ["schema_version", "run_id", "owner_id", "input_version", "facts_version", "facts"], "snapshot");
  requireVersion(value.schema_version, CONTRACT_VERSIONS.facts, "snapshot.schema_version");
  return {
    schema_version: CONTRACT_VERSIONS.facts,
    run_id: requireString(value.run_id, "snapshot.run_id"),
    owner_id: requireString(value.owner_id, "snapshot.owner_id"),
    input_version: requirePositiveInteger(value.input_version, "snapshot.input_version"),
    facts_version: requirePositiveInteger(value.facts_version, "snapshot.facts_version"),
    facts: validateExpenseFacts(value.facts),
  };
}

export const BINDING_FIELDS = ["run_id", "owner_id", "input_version", "facts_version", "policy_version", "plan_id", "plan_version"] as const;
export function validateVersionBinding(raw: unknown): VersionBinding {
  const value = requireRecord(raw, BINDING_FIELDS, "binding");
  requireVersion(value.policy_version, POLICY_VERSION, "binding.policy_version");
  return {
    run_id: requireString(value.run_id, "binding.run_id"),
    owner_id: requireString(value.owner_id, "binding.owner_id"),
    input_version: requirePositiveInteger(value.input_version, "binding.input_version"),
    facts_version: requirePositiveInteger(value.facts_version, "binding.facts_version"),
    policy_version: POLICY_VERSION,
    plan_id: requireString(value.plan_id, "binding.plan_id"),
    plan_version: requirePositiveInteger(value.plan_version, "binding.plan_version"),
  };
}

function bindingFrom(value: Record<string, unknown>): VersionBinding {
  return validateVersionBinding(Object.fromEntries(BINDING_FIELDS.map((key) => [key, value[key]])));
}

export function assertCurrentVersionBinding(current: VersionBinding, candidate: VersionBinding): void {
  const validCurrent = validateVersionBinding(current);
  const validCandidate = validateVersionBinding(candidate);
  for (const key of BINDING_FIELDS) {
    if (validCurrent[key] !== validCandidate[key]) {
      throw new DomainValidationError(`The ${key} binding is stale or belongs to another run or owner.`, key, "STALE_VERSION");
    }
  }
}

export function validateCitationShape(raw: unknown): PolicyCitation[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new DomainValidationError("citations must be a non-empty array.", "citations");
  const ids = new Set<string>();
  return raw.map((citation, index) => {
    const field = `citations[${index}]`;
    const value = requireRecord(citation, ["clause_id", "policy_version", "original_text"], field);
    requireVersion(value.policy_version, POLICY_VERSION, `${field}.policy_version`);
    const id = requireString(value.clause_id, `${field}.clause_id`);
    if (ids.has(id)) throw new DomainValidationError("Duplicate policy citation.", `${field}.clause_id`);
    ids.add(id);
    // Preserve the original byte-for-byte text for canonical verification.
    requireString(value.original_text, `${field}.original_text`);
    return { clause_id: id, policy_version: POLICY_VERSION, original_text: value.original_text as string };
  });
}

export function validateProposedCase(raw: unknown): ProposedCase {
  const value = requireRecord(raw, ["case_type", "employee_identifier", "amount_minor", "currency", "receipt_status", "description", "evidence_requirements"], "proposed_case");
  if (value.case_type !== "EVIDENCE_REQUEST" && value.case_type !== "MANUAL_REVIEW") throw new DomainValidationError("Invalid case_type.", "proposed_case.case_type");
  if (value.currency !== "USD") throw new DomainValidationError("proposed_case.currency must be 'USD'.", "proposed_case.currency");
  if (value.receipt_status !== "available" && value.receipt_status !== "missing") throw new DomainValidationError("A case needs a known receipt status.", "proposed_case.receipt_status");
  const employee = nullableText(value.employee_identifier, "proposed_case.employee_identifier");
  if (!employee) throw new DomainValidationError("A case needs a known employee identifier.", "proposed_case.employee_identifier");
  return {
    case_type: value.case_type,
    employee_identifier: employee,
    amount_minor: requireAmount(value.amount_minor, "proposed_case.amount_minor"),
    currency: "USD",
    receipt_status: value.receipt_status,
    description: nullableText(value.description, "proposed_case.description"),
    evidence_requirements: requireStrings(value.evidence_requirements, "proposed_case.evidence_requirements"),
  };
}

export function validateExceptionPlan(raw: unknown): ExceptionPlan {
  const value = requireRecord(raw, ["schema_version", ...BINDING_FIELDS, "action", "proposed_case", "citations", "rationale"], "plan");
  requireVersion(value.schema_version, CONTRACT_VERSIONS.plan, "plan.schema_version");
  if (value.action !== ALLOWED_ACTION) throw new DomainValidationError("Only create_exception_case is allowed.", "plan.action");
  return {
    schema_version: CONTRACT_VERSIONS.plan,
    ...bindingFrom(value),
    action: ALLOWED_ACTION,
    proposed_case: validateProposedCase(value.proposed_case),
    citations: validateCitationShape(value.citations),
    rationale: requireString(value.rationale, "plan.rationale"),
  };
}

export function validateReviewRecord(raw: unknown): ReviewRecord {
  const value = requireRecord(raw, ["schema_version", ...BINDING_FIELDS, "review_id", "verdict", "issues", "citations", "reviewed_at"], "review");
  requireVersion(value.schema_version, CONTRACT_VERSIONS.review, "review.schema_version");
  if (!["PASS", "NEEDS_INFO", "BLOCKED"].includes(value.verdict as string)) throw new DomainValidationError("Invalid review verdict.", "review.verdict");
  const issues = requireStrings(value.issues, "review.issues");
  if (value.verdict === "PASS" && issues.length > 0) throw new DomainValidationError("A passing review cannot contain unresolved issues.", "review.issues");
  if (value.verdict !== "PASS" && issues.length === 0) throw new DomainValidationError("A non-passing review must identify issues.", "review.issues");
  return {
    schema_version: CONTRACT_VERSIONS.review, ...bindingFrom(value),
    review_id: requireString(value.review_id, "review.review_id"), verdict: value.verdict as ReviewRecord["verdict"],
    issues, citations: validateCitationShape(value.citations), reviewed_at: requireTimestamp(value.reviewed_at, "review.reviewed_at"),
  };
}

export function validateApprovalSnapshot(raw: unknown): ApprovalSnapshot {
  const value = requireRecord(raw, ["schema_version", ...BINDING_FIELDS, "approval_id", "action", "input_digest", "plan_digest", "approved_at", "expires_at"], "approval");
  requireVersion(value.schema_version, CONTRACT_VERSIONS.approval, "approval.schema_version");
  if (value.action !== ALLOWED_ACTION) throw new DomainValidationError("Only create_exception_case is allowed.", "approval.action");
  for (const key of ["input_digest", "plan_digest"]) {
    if (typeof value[key] !== "string" || !/^[a-f0-9]{64}$/.test(value[key] as string)) throw new DomainValidationError(`${key} must be a SHA-256 hex digest.`, `approval.${key}`);
  }
  const approvedAt = requireTimestamp(value.approved_at, "approval.approved_at");
  const expiresAt = requireTimestamp(value.expires_at, "approval.expires_at");
  if (Date.parse(expiresAt) <= Date.parse(approvedAt)) throw new DomainValidationError("Approval expiry must follow confirmation.", "approval.expires_at");
  return {
    schema_version: CONTRACT_VERSIONS.approval, ...bindingFrom(value),
    approval_id: requireString(value.approval_id, "approval.approval_id"), action: ALLOWED_ACTION,
    input_digest: value.input_digest as string, plan_digest: value.plan_digest as string,
    approved_at: approvedAt, expires_at: expiresAt,
  };
}

export function validateExceptionCase(raw: unknown): ExceptionCase {
  const proposedFields = ["case_type", "employee_identifier", "amount_minor", "currency", "receipt_status", "description", "evidence_requirements"];
  const value = requireRecord(raw, ["schema_version", ...BINDING_FIELDS, ...proposedFields, "case_id", "approval_id", "action", "status", "synthetic", "citations", "created_at"], "case");
  requireVersion(value.schema_version, CONTRACT_VERSIONS.case, "case.schema_version");
  if (value.action !== ALLOWED_ACTION || value.status !== "OPEN" || value.synthetic !== true) {
    throw new DomainValidationError("Cases must be OPEN synthetic create_exception_case records.", "case");
  }
  return {
    schema_version: CONTRACT_VERSIONS.case, ...bindingFrom(value),
    ...validateProposedCase(Object.fromEntries(proposedFields.map((key) => [key, value[key]]))),
    case_id: requireString(value.case_id, "case.case_id"), approval_id: requireString(value.approval_id, "case.approval_id"),
    action: ALLOWED_ACTION, status: "OPEN", synthetic: true,
    citations: validateCitationShape(value.citations), created_at: requireTimestamp(value.created_at, "case.created_at"),
  };
}
