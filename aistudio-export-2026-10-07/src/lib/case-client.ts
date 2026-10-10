import {
  BINDING_FIELDS, assertCurrentVersionBinding, validateExceptionCase, validateVersionBinding,
  type ExceptionCase, type VersionBinding,
} from "../domain/contracts.ts";

export interface PreparedConfirmation {
  approval_id: string;
  binding: VersionBinding;
  action: "create_exception_case";
  input_digest: string;
  plan_digest: string;
  prepared_at: string;
  expires_at: string;
}

export interface PendingCaseCommand {
  schema_version: "1.0.0";
  owner_id: string;
  confirmation: PreparedConfirmation;
  idempotency_key: string;
  case_id: string | null;
  committed_approval_id: string | null;
  invalidated_locally: boolean;
}

export function caseBinding(value: VersionBinding): VersionBinding {
  return validateVersionBinding(Object.fromEntries(BINDING_FIELDS.map((key) => [key, value[key]])));
}

export function validatePreparedConfirmation(raw: unknown, expected: VersionBinding): PreparedConfirmation {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("The server did not return a valid confirmation preview.");
  const value = raw as PreparedConfirmation;
  const binding = validateVersionBinding(value.binding);
  assertCurrentVersionBinding(caseBinding(expected), binding);
  if (typeof value.approval_id !== "string" || !value.approval_id.trim() || value.action !== "create_exception_case" ||
    !/^[a-f0-9]{64}$/.test(value.input_digest) || !/^[a-f0-9]{64}$/.test(value.plan_digest) ||
    !Number.isFinite(Date.parse(value.prepared_at)) || !Number.isFinite(Date.parse(value.expires_at)) ||
    Date.parse(value.expires_at) <= Date.parse(value.prepared_at)) {
    throw new Error("The confirmation preview has invalid digests, action or expiry.");
  }
  return {
    approval_id: value.approval_id, binding, action: value.action,
    input_digest: value.input_digest, plan_digest: value.plan_digest,
    prepared_at: value.prepared_at, expires_at: value.expires_at,
  };
}

export function validatePendingCaseCommand(raw: unknown, ownerId: string): PendingCaseCommand {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Saved recovery command is invalid.");
  const value = raw as PendingCaseCommand;
  if (value.schema_version !== "1.0.0" || value.owner_id !== ownerId ||
    typeof value.idempotency_key !== "string" || !/^[a-zA-Z0-9_-]{8,128}$/.test(value.idempotency_key) ||
    (value.case_id !== null && (typeof value.case_id !== "string" || !value.case_id.trim())) ||
    (value.committed_approval_id != null && (typeof value.committed_approval_id !== "string" || !value.committed_approval_id.trim())) ||
    (value.invalidated_locally !== undefined && typeof value.invalidated_locally !== "boolean")) {
    throw new Error("Saved recovery command does not match the visitor session.");
  }
  const confirmation = validatePreparedConfirmation(value.confirmation, value.confirmation?.binding);
  if (confirmation.binding.owner_id !== ownerId) throw new Error("Saved recovery command belongs to another visitor.");
  return {
    schema_version: "1.0.0", owner_id: ownerId, confirmation,
    idempotency_key: value.idempotency_key, case_id: value.case_id,
    committed_approval_id: value.committed_approval_id ?? null,
    invalidated_locally: value.invalidated_locally ?? false,
  };
}

export function verifyIndependentCase(raw: unknown, ownerId: string, caseId: string, command?: PendingCaseCommand): ExceptionCase {
  const savedCase = validateExceptionCase(raw);
  if (savedCase.owner_id !== ownerId || savedCase.case_id !== caseId) throw new Error("Saved-case readback does not match this visitor and case.");
  if (command) {
    assertCurrentVersionBinding(command.confirmation.binding, caseBinding(savedCase));
    if (savedCase.approval_id !== (command.committed_approval_id ?? command.confirmation.approval_id)) throw new Error("Saved case does not match the committed human confirmation.");
  }
  return savedCase;
}

export const RECOVERY_STORAGE_PREFIX = "opscrew-case-recovery-v1:";

export function readRecoveryCommand(ownerId: string): PendingCaseCommand | null {
  const raw = window.sessionStorage.getItem(`${RECOVERY_STORAGE_PREFIX}${ownerId}`);
  return raw ? validatePendingCaseCommand(JSON.parse(raw), ownerId) : null;
}

export function saveRecoveryCommand(command: PendingCaseCommand): void {
  const safeCommand = validatePendingCaseCommand(command, command.owner_id);
  window.sessionStorage.setItem(`${RECOVERY_STORAGE_PREFIX}${command.owner_id}`, JSON.stringify(safeCommand));
}

export function clearRecoveryCommand(ownerId: string): void {
  window.sessionStorage.removeItem(`${RECOVERY_STORAGE_PREFIX}${ownerId}`);
}

export function caseSubmissionPath(command: PendingCaseCommand, forceReadOnly = false): "/api/cases" | "/api/cases/recover" {
  return command.invalidated_locally || forceReadOnly ? "/api/cases/recover" : "/api/cases";
}

export class CaseRequestError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) {
    super(message);
    this.name = "CaseRequestError";
  }
}

export function isDefinitiveCaseDecline(cause: unknown): cause is CaseRequestError {
  return cause instanceof CaseRequestError && cause.status >= 400 && cause.status < 500 && [
    "CONFIRMATION_EXPIRED", "STALE_VERSION", "PLAN_NOT_REVIEWABLE", "REVIEW_FAILED", "POLICY_BLOCKED",
    "CONFIRMATION_REQUIRED", "INVALID_REQUEST", "INVALID_CONTRACT", "IDEMPOTENCY_CONFLICT", "NOT_FOUND",
  ].includes(cause.code);
}

export async function authenticatedHeaders(getHeaders: () => Promise<Record<string, string>>, signal: AbortSignal): Promise<Record<string, string>> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const cancelled = () => reject(signal.reason ?? new DOMException("The request was cancelled.", "AbortError"));
    signal.addEventListener("abort", cancelled, { once: true });
    Promise.resolve().then(() => { signal.throwIfAborted(); return getHeaders(); }).then(
      (value) => { signal.removeEventListener("abort", cancelled); if (signal.aborted) cancelled(); else resolve(value); },
      (cause) => { signal.removeEventListener("abort", cancelled); reject(cause); },
    );
  });
}

// Case requests never automatically retry. Mutations retain one command for explicit recovery.
export async function caseApi<T>(path: string, headers: () => Promise<Record<string, string>>, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const timeout = AbortSignal.timeout(20_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const authorization = await authenticatedHeaders(headers, signal);
  signal.throwIfAborted();
  const response = await fetch(path, {
    method: options.method ?? "GET", signal, cache: "no-store",
    headers: { ...authorization, Accept: "application/json", ...(options.body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    throw new Error(`Case service returned HTTP ${response.status} without a JSON result. Verify saved history before retrying.`);
  }
  const payload = await response.json();
  if (!response.ok || payload?.ok !== true) {
    throw new CaseRequestError(
      typeof payload?.error?.message === "string" ? payload.error.message : "Case request failed. No verified success is available.",
      typeof payload?.error?.code === "string" ? payload.error.code : "CASE_REQUEST_FAILED",
      typeof payload?.http_status === "number" ? payload.http_status : response.status,
    );
  }
  return payload as T;
}
