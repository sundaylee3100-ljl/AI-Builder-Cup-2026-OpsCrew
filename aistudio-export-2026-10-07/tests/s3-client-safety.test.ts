import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CaseConfirmation from "../src/components/CaseConfirmation.tsx";
import { POLICY_VERSION, type ExceptionCase, type VersionBinding } from "../src/domain/contracts.ts";
import { policyCitations } from "../src/domain/policy.ts";
import { validateBrowserSessionConfig, type CaseBackendConfig } from "../src/lib/firebase-session.ts";
import {
  CaseRequestError, authenticatedHeaders, caseApi, caseSubmissionPath, isDefinitiveCaseDecline, validatePendingCaseCommand,
  validatePreparedConfirmation, verifyIndependentCase, type PendingCaseCommand, type PreparedConfirmation,
} from "../src/lib/case-client.ts";

const binding: VersionBinding = {
  run_id: "run_synthetic_client", owner_id: "visitor-synthetic-a", input_version: 5,
  facts_version: 1, policy_version: POLICY_VERSION, plan_id: "plan_synthetic_client", plan_version: 1,
};
const confirmation: PreparedConfirmation = {
  approval_id: "approval_synthetic_client", binding, action: "create_exception_case",
  input_digest: "a".repeat(64), plan_digest: "b".repeat(64),
  prepared_at: "2026-10-10T00:00:00.000Z", expires_at: "2026-10-10T00:05:00.000Z",
};
const command: PendingCaseCommand = {
  schema_version: "1.0.0", owner_id: binding.owner_id, confirmation,
  idempotency_key: "synthetic-command-1234", case_id: "case_synthetic_client", committed_approval_id: confirmation.approval_id, invalidated_locally: false,
};
const savedCase: ExceptionCase = {
  schema_version: "1.0.0", ...binding, case_type: "EVIDENCE_REQUEST", employee_identifier: "SYNTH-EMP-1001",
  amount_minor: 3800, currency: "USD", receipt_status: "missing", description: "[SYNTHETIC] Parking fee.",
  evidence_requirements: ["Request synthetic evidence."], case_id: command.case_id!, approval_id: confirmation.approval_id,
  action: "create_exception_case", status: "OPEN", synthetic: true,
  citations: policyCitations("SYN-001", "SYN-004", "SYN-007"), created_at: "2026-10-10T00:01:00.000Z",
};
const emulatorConfig: CaseBackendConfig = {
  enabled: true, mode: "emulator", firebase: { apiKey: "emulator-only", projectId: "demo-opscrew" },
  auth_emulator_url: "http://127.0.0.1:9099",
};

test("a newly signed-in visitor with no plan or receipt never sees a saved-case success claim", () => {
  const html = renderToStaticMarkup(createElement(CaseConfirmation, {
    config: emulatorConfig,
    session: { uid: "new-synthetic-visitor", ready: true, busy: false, error: "", start: async () => {}, end: async () => {}, headers: async () => ({}) },
    workflow: null,
    inputRevision: 1,
    onRejected: () => {},
  }));
  assert.match(html, /A current plan with a passing review/);
  assert.doesNotMatch(html, /already has a verified saved case|Saved case verified by independent readback/);
});

test("browser emulators require both explicitly local config and localhost page", () => {
  assert.doesNotThrow(() => validateBrowserSessionConfig(emulatorConfig, "localhost"));
  assert.throws(() => validateBrowserSessionConfig(emulatorConfig, "public.example.com"), /localhost/);
  for (const auth_emulator_url of ["http://public.example.com:9099", "https://localhost:9099", "http://user:pass@localhost:9099", "http://localhost:9099/path", "http://localhost:9099/?key=x"]) {
    assert.throws(() => validateBrowserSessionConfig({ ...emulatorConfig, auth_emulator_url }, "localhost"));
  }
});

test("real Firebase browser mode rejects emulator endpoints or missing public project config", () => {
  assert.doesNotThrow(() => validateBrowserSessionConfig({ ...emulatorConfig, mode: "firestore", auth_emulator_url: null }, "preview.example.com"));
  assert.throws(() => validateBrowserSessionConfig({ ...emulatorConfig, mode: "firestore" }, "localhost"));
  assert.throws(() => validateBrowserSessionConfig({ ...emulatorConfig, firebase: null }, "localhost"));
});

test("confirmation preview must bind exactly the current run, owner and all versions", () => {
  assert.deepEqual(validatePreparedConfirmation(confirmation, binding), confirmation);
  for (const change of [{ owner_id: "visitor-b" }, { input_version: 6 }, { facts_version: 2 }, { plan_version: 2 }, { run_id: "run_other" }]) {
    assert.throws(() => validatePreparedConfirmation({ ...confirmation, binding: { ...binding, ...change } }, binding), /stale/);
  }
});

test("confirmation preview rejects invalid action, digests and expiry", () => {
  for (const change of [{ action: "pay" }, { input_digest: "short" }, { plan_digest: "X".repeat(64) }, { expires_at: confirmation.prepared_at }, { prepared_at: "unknown" }]) {
    assert.throws(() => validatePreparedConfirmation({ ...confirmation, ...change }, binding));
  }
});

test("saved recovery command is scoped to owner and retains exact idempotency identity", () => {
  assert.deepEqual(validatePendingCaseCommand(command, binding.owner_id), command);
  assert.throws(() => validatePendingCaseCommand(command, "visitor-other"), /visitor/);
  assert.throws(() => validatePendingCaseCommand({ ...command, confirmation: { ...confirmation, binding: { ...binding, owner_id: "visitor-other" } } }, binding.owner_id), /another visitor/);
  assert.throws(() => validatePendingCaseCommand({ ...command, idempotency_key: "bad key" }, binding.owner_id));
});

test("a locally edited pending command survives reload as read-only recovery even when server invalidation was lost", () => {
  const edited = validatePendingCaseCommand(JSON.parse(JSON.stringify({ ...command, case_id: null, invalidated_locally: true })), binding.owner_id);
  assert.equal(caseSubmissionPath(edited), "/api/cases/recover");
  assert.equal(caseSubmissionPath({ ...command, case_id: null }, true), "/api/cases/recover");
  assert.equal(caseSubmissionPath({ ...command, case_id: null }), "/api/cases");
  assert.throws(() => validatePendingCaseCommand({ ...command, invalidated_locally: "false" }, binding.owner_id));
});

test("a valid previously committed case can be read after confirmation expiry", () => {
  assert.deepEqual(verifyIndependentCase(savedCase, binding.owner_id, savedCase.case_id, command), savedCase);
});

test("a business replay verifies the original committed approval while retaining the new retry command", () => {
  const replayCommand: PendingCaseCommand = {
    ...command,
    confirmation: { ...confirmation, approval_id: "approval_second_intent_same_business" },
    committed_approval_id: savedCase.approval_id,
  };
  assert.deepEqual(verifyIndependentCase(savedCase, binding.owner_id, savedCase.case_id, replayCommand), savedCase);
  assert.equal(validatePendingCaseCommand(replayCommand, binding.owner_id).confirmation.approval_id, "approval_second_intent_same_business");
  assert.throws(() => verifyIndependentCase(savedCase, binding.owner_id, savedCase.case_id, { ...replayCommand, committed_approval_id: "approval_not_committed" }), /confirmation/);
});

test("independent readback rejects wrong owner, case, approval and version", () => {
  assert.throws(() => verifyIndependentCase(savedCase, "visitor-other", savedCase.case_id, command), /visitor/);
  assert.throws(() => verifyIndependentCase(savedCase, binding.owner_id, "case_other", command), /case/);
  assert.throws(() => verifyIndependentCase({ ...savedCase, approval_id: "approval-other" }, binding.owner_id, savedCase.case_id, command), /confirmation/);
  assert.throws(() => verifyIndependentCase({ ...savedCase, plan_version: 2 }, binding.owner_id, savedCase.case_id, command), /stale/);
});

test("independent readback cannot promote non-synthetic or payment records to verified cases", () => {
  for (const change of [{ synthetic: false }, { action: "pay" }, { amount_minor: 38.5 }, { receipt_status: "unknown" }, { status: "PAID" }]) {
    assert.throws(() => verifyIndependentCase({ ...savedCase, ...change }, binding.owner_id, savedCase.case_id, command));
  }
});

test("network and storage uncertainty retain recovery commands while definitive precommit declines can close", () => {
  assert.equal(isDefinitiveCaseDecline(new TypeError("fetch failed")), false);
  assert.equal(isDefinitiveCaseDecline(new CaseRequestError("Unavailable", "CASE_STORAGE_UNAVAILABLE", 503)), false);
  assert.equal(isDefinitiveCaseDecline(new CaseRequestError("Unauthorized", "AUTH_REQUIRED", 401)), false);
  assert.equal(isDefinitiveCaseDecline(new CaseRequestError("Expired", "CONFIRMATION_EXPIRED", 409)), true);
  assert.equal(isDefinitiveCaseDecline(new CaseRequestError("Stale", "STALE_VERSION", 409)), true);
});

test("case transport sends one authenticated no-cache request and preserves command body", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async (url, options) => {
      calls += 1;
      assert.equal(url, "/api/cases");
      assert.equal(options?.cache, "no-store");
      assert.equal(options?.method, "POST");
      assert.equal((options?.headers as Record<string, string>).Authorization, "Bearer synthetic-token-only");
      assert.deepEqual(JSON.parse(options!.body as string), { idempotency_key: command.idempotency_key, confirmed: true });
      return new Response(JSON.stringify({ ok: true, case_id: savedCase.case_id, committed: true }), { headers: { "Content-Type": "application/json" } });
    };
    await caseApi("/api/cases", async () => ({ Authorization: "Bearer synthetic-token-only" }), { method: "POST", body: { idempotency_key: command.idempotency_key, confirmed: true } });
    assert.equal(calls, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test("cancellation bounds Firebase token waiting and prevents a request after an input edit", async () => {
  const controller = new AbortController();
  const waiting = authenticatedHeaders(() => new Promise(() => {}), controller.signal);
  controller.abort(new DOMException("Inputs changed.", "AbortError"));
  await assert.rejects(waiting, /Inputs changed/);
  let calls = 0;
  await assert.rejects(authenticatedHeaders(async () => { calls += 1; return {}; }, controller.signal), /Inputs changed/);
  assert.equal(calls, 0);
});

test("non-JSON case errors never echo upstream page content", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("unexpected-private-upstream-content", { status: 502, headers: { "Content-Type": "text/html" } });
    await assert.rejects(caseApi("/api/cases", async () => ({ Authorization: "Bearer synthetic-token-only" })), (error: Error) => {
      assert.doesNotMatch(error.message, /private-upstream/);
      assert.match(error.message, /HTTP 502/);
      return true;
    });
  } finally { globalThis.fetch = originalFetch; }
});

test("case transport reports structured actual status through reverse-proxy mapped errors", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: false, http_status: 409, error: { code: "CONFIRMATION_EXPIRED", message: "Confirmation expired." } }), { status: 500, headers: { "Content-Type": "application/json" } });
    await assert.rejects(caseApi("/api/cases", async () => ({ Authorization: "Bearer synthetic-token-only" })), (error: unknown) => {
      assert.ok(error instanceof CaseRequestError);
      assert.equal(error.status, 409);
      assert.equal(isDefinitiveCaseDecline(error), true);
      return true;
    });
  } finally { globalThis.fetch = originalFetch; }
});
