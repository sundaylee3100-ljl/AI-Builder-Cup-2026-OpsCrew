import assert from "node:assert/strict";
import test from "node:test";
import { ALLOWED_ACTION, CONTRACT_VERSIONS, POLICY_VERSION } from "../src/domain/contracts.ts";
import type { ExpenseFacts, VersionBinding } from "../src/domain/contracts.ts";
import { evaluatePolicy } from "../src/domain/policy.ts";
import { CaseService, CaseServiceError, MemoryCaseStore, projectBinding, sha256 } from "../server/case-service.ts";
import type { CaseStore, ConfirmCommand, DurableRun, RecordKind } from "../server/case-service.ts";
import type { WorkflowResponse } from "../server/planning-contracts.ts";
import { createFirebaseRuntime } from "../server/firebase-runtime.ts";

const UID = "synthetic-owner-one", OTHER = "synthetic-owner-two";
const INTAKE = {synthetic_only: true, description: "Synthetic lunch expense USD 42 with a missing receipt.", amount_usd: 42, amount_minor_input: 4200, receipt_status: "missing", employee_identifier: "SYN-EMP-01"};
const FACTS: ExpenseFacts = {amount_minor: 4200, currency: "USD", receipt_status: "missing", description: "Synthetic lunch expense.", employee_identifier: "SYN-EMP-01", missing_information: [], contradictions: []};

export function acceptedWorkflow(facts: ExpenseFacts = FACTS): WorkflowResponse {
  const decision = evaluatePolicy(facts);
  const binding: VersionBinding = {run_id: "local-preview-run", owner_id: "local-preview", input_version: 37, facts_version: 1, policy_version: POLICY_VERSION, plan_id: "local-preview-plan", plan_version: 1};
  const timestamp = "2026-10-10T05:00:00.000Z";
  return {
    ok: true, run_id: binding.run_id, timestamp, requested_model_id: "gemini-3.1-flash-lite", model_id: "offline-fixture-model", http_status: 200, upstream_status: 200,
    facts, workflow: {
      stage: "S2", status: decision.status, decision, execution_authorized: false, binding, steps: [], planner_rationale: "The frozen synthetic policy supports this case.",
      plan: decision.case_eligible ? {schema_version: CONTRACT_VERSIONS.plan, ...binding, action: ALLOWED_ACTION, proposed_case: {case_type: decision.branch as "EVIDENCE_REQUEST" | "MANUAL_REVIEW", employee_identifier: facts.employee_identifier!, amount_minor: facts.amount_minor!, currency: "USD", receipt_status: facts.receipt_status as "available" | "missing", description: facts.description, evidence_requirements: decision.evidence_requirements}, citations: decision.citations, rationale: "Create the permitted synthetic evidence request after human confirmation."} : null,
      review: {schema_version: CONTRACT_VERSIONS.review, ...binding, review_id: "offline-review", verdict: "PASS", issues: [], citations: decision.citations, reviewed_at: timestamp},
    },
  };
}
function setup(store: CaseStore = new MemoryCaseStore()) {
  let now = Date.parse("2026-10-10T05:00:00.000Z"), count = 0;
  const service = new CaseService({store, now: () => now, id: () => `synthetic-id-${++count}`, approvalTtlMs: 60_000});
  return {service, store, tick: (ms: number) => { now += ms; }};
}
async function seed(service: CaseService, uid = UID, response = acceptedWorkflow()) {
  const run = await service.createRun(uid, INTAKE, 37);
  const completed = await service.completeRun(uid, run.run_id, response);
  return {run, completed, binding: completed.workflow!.binding};
}
async function commandFor(service: CaseService, binding: VersionBinding, key = "same-recovery-command"): Promise<ConfirmCommand> {
  const intent = await service.prepareConfirmation(binding.owner_id, binding.run_id, binding);
  return {approval_id: intent.approval_id, binding, idempotency_key: key, confirmed: true};
}
async function rejects(operation: Promise<unknown>, code: string) {
  await assert.rejects(operation, (error: unknown) => error instanceof CaseServiceError && error.code === code);
}
async function count(store: CaseStore, kind: RecordKind, uid = UID) { return (await store.list(kind, uid)).length; }

test("server-owned durable run replaces preview ownership and ignores caller version authority", async () => {
  const {service} = setup(); const {run, completed, binding} = await seed(service);
  assert.equal(run.input_version, 1); assert.equal(binding.input_version, 1); assert.equal(binding.owner_id, UID);
  assert.equal(completed.run_id, run.run_id); assert.equal(binding.run_id, run.run_id);
  assert.match(binding.plan_id, /^plan_/); assert.notEqual(binding.plan_id, "local-preview-plan");
  assert.deepEqual(projectBinding(completed.workflow!.plan!), binding);
  assert.deepEqual(projectBinding(completed.workflow!.review!), binding);
  const stored = await service.getRun(UID, run.run_id); assert.deepEqual(stored.workflow_response, completed);
  assert.equal(stored.status, "REVIEWABLE");
});
test("preparing review binds digests but creates no approval, case, or success audit", async () => {
  const {service, store} = setup(); const {binding} = await seed(service);
  const intent = await service.prepareConfirmation(UID, binding.run_id, binding);
  assert.equal(intent.input_digest, sha256(INTAKE)); assert.match(intent.plan_digest, /^[a-f0-9]{64}$/);
  assert.equal(await count(store, "confirmations"), 1);
  assert.equal(await count(store, "approvals"), 0); assert.equal(await count(store, "cases"), 0); assert.equal(await count(store, "audit"), 0);
  const command = {approval_id: intent.approval_id, binding, idempotency_key: "explicit-only-key", confirmed: false};
  await rejects(service.confirm(UID, command as unknown as ConfirmCommand), "CONFIRMATION_REQUIRED");
  assert.equal(await count(store, "cases"), 0);
});
test("confirmation commits snapshot, deterministic case, audit and idempotency atomically then independently reads", async () => {
  const {service, store} = setup(); const {binding} = await seed(service); const command = await commandFor(service, binding);
  const result = await service.confirm(UID, command);
  assert.equal(result.committed, true); assert.equal(result.replayed, false);
  for (const kind of ["cases", "approvals", "audit", "idempotency"] as const) assert.equal(await count(store, kind), 1);
  const read = await service.readCase(UID, result.case_id);
  assert.equal(read.amount_minor, 4200); assert.equal(read.employee_identifier, "SYN-EMP-01"); assert.equal(read.synthetic, true); assert.equal(read.status, "OPEN");
  assert.equal((await service.getRun(UID, binding.run_id)).status, "SUBMITTED");
  assert.deepEqual(projectBinding(read), binding);
});
test("twenty concurrent commands with distinct client keys create one business case", async () => {
  const {service, store} = setup(); const {binding} = await seed(service); const command = await commandFor(service, binding);
  const results = await Promise.all(Array.from({length: 20}, (_, index) => service.confirm(UID, {...command, idempotency_key: `concurrent-client-${index}`})));
  assert.equal(new Set(results.map((result) => result.case_id)).size, 1);
  assert.equal(results.filter((result) => !result.replayed).length, 1);
  for (const kind of ["cases", "approvals", "audit"] as const) assert.equal(await count(store, kind), 1);
  assert.equal(await count(store, "idempotency"), 20);
});
test("distinct prepared intents and keys replay the original committed approval", async () => {
  const {service, store} = setup(); const {binding} = await seed(service);
  const first = await commandFor(service, binding, "first-prepared-command");
  const second = await commandFor(service, binding, "second-prepared-command");
  const results = await Promise.all([service.confirm(UID, first), service.confirm(UID, second)]);
  assert.equal(results[0].case_id, results[1].case_id); assert.equal(results[0].approval_id, results[1].approval_id);
  assert.equal(results[0].approval_id, first.approval_id);
  assert.equal((await service.readCase(UID, results[1].case_id)).approval_id, results[1].approval_id);
  assert.equal(await count(store, "approvals"), 1); assert.equal(await count(store, "cases"), 1);
});
test("response loss recovers exact committed command after expiry and a later input", async () => {
  const {service, store, tick} = setup(); const {binding} = await seed(service); const command = await commandFor(service, binding);
  const lostResult = await service.confirm(UID, command); // Simulates successful commit whose HTTP response is lost.
  tick(120_000); await seed(service);
  const recovered = await service.confirm(UID, command);
  assert.equal(recovered.case_id, lostResult.case_id); assert.equal(recovered.replayed, true);
  assert.equal((await service.readCase(UID, recovered.case_id)).case_id, lostResult.case_id);
  assert.equal(await count(store, "cases"), 1); assert.equal(await count(store, "audit"), 1);
});
test("read-only recovery of an uncommitted locally edited command creates no records", async () => {
  const {service, store} = setup(); const {binding} = await seed(service); const command = await commandFor(service, binding);
  // An edit may fail to reach invalidation; recovery must not convert this still-current plan into a case.
  await rejects(service.recover(UID, command), "CASE_NOT_COMMITTED");
  for (const kind of ["cases", "approvals", "audit", "idempotency"] as const) assert.equal(await count(store, kind), 0);
  assert.equal((await service.getRun(UID, binding.run_id)).status, "REVIEWABLE");
});
test("read-only recovery returns the committed case after expiry and edits without new idempotency writes", async () => {
  const {service, store, tick} = setup(); const {binding} = await seed(service);
  const command = await commandFor(service, binding, "original-write-command");
  const otherIntent = await commandFor(service, binding, "read-only-distinct-key");
  const committed = await service.confirm(UID, command); tick(120_000); await seed(service);
  for (const candidate of [command, otherIntent]) {
    const recovered = await service.recover(UID, candidate);
    assert.equal(recovered.case_id, committed.case_id); assert.equal(recovered.approval_id, command.approval_id); assert.equal(recovered.replayed, true);
  }
  for (const kind of ["cases", "approvals", "audit", "idempotency"] as const) assert.equal(await count(store, kind), 1);
});
test("read-only recovery retains cross-owner and same-key content protections", async () => {
  const {service, store} = setup(); const {binding} = await seed(service);
  const first = await commandFor(service, binding, "read-content-bound-key");
  const second = await commandFor(service, binding, "read-content-bound-key");
  await service.confirm(UID, first);
  await rejects(service.recover(OTHER, first), "NOT_FOUND");
  await rejects(service.recover(UID, second), "IDEMPOTENCY_CONFLICT");
  assert.equal(await count(store, "idempotency"), 1);
});
test("same key with different content is rejected even if the business case already exists", async () => {
  const {service, store} = setup(); const {binding} = await seed(service);
  const first = await commandFor(service, binding, "same-content-bound-key");
  const second = await commandFor(service, binding, "same-content-bound-key");
  await service.confirm(UID, first); await rejects(service.confirm(UID, second), "IDEMPOTENCY_CONFLICT");
  assert.equal(await count(store, "cases"), 1); assert.equal(await count(store, "idempotency"), 1);
});
test("an expired uncommitted intent creates zero cases and a fresh intent can succeed", async () => {
  const {service, store, tick} = setup(); const {binding} = await seed(service); const command = await commandFor(service, binding);
  tick(60_000); await rejects(service.confirm(UID, command), "CONFIRMATION_EXPIRED");
  assert.equal(await count(store, "cases"), 0); assert.equal(await count(store, "approvals"), 0);
  await service.confirm(UID, await commandFor(service, binding, "fresh-after-expiry")); assert.equal(await count(store, "cases"), 1);
});
test("a newer input invalidates earlier plans before case writes", async () => {
  const {service, store} = setup(); const {binding} = await seed(service); const command = await commandFor(service, binding);
  const next = await service.createRun(UID, {...INTAKE, amount_usd: 43}, 1); assert.equal(next.input_version, 2);
  await rejects(service.prepareConfirmation(UID, binding.run_id, binding), "STALE_VERSION");
  await rejects(service.confirm(UID, command), "STALE_VERSION"); assert.equal(await count(store, "cases"), 0);
});
for (const status of ["REJECTED", "INVALIDATED"] as const) {
  test(`${status.toLowerCase()} current run cannot use an earlier prepared confirmation`, async () => {
    const {service, store} = setup(); const {binding} = await seed(service); const command = await commandFor(service, binding);
    await service.markRun(UID, binding.run_id, binding, status);
    await rejects(service.confirm(UID, command), "PLAN_NOT_REVIEWABLE");
    assert.equal(await count(store, "cases"), 0); assert.equal(await count(store, "approvals"), 0);
    assert.equal((await service.getRun(UID, binding.run_id)).status, status);
  });
}
test("cross-session reads, writes and lists do not disclose another user's records", async () => {
  const {service, store} = setup(); const {binding} = await seed(service); const command = await commandFor(service, binding);
  await rejects(service.getRun(OTHER, binding.run_id), "NOT_FOUND");
  await rejects(service.prepareConfirmation(OTHER, binding.run_id, binding), "NOT_FOUND");
  await rejects(service.confirm(OTHER, command), "NOT_FOUND");
  const committed = await service.confirm(UID, command);
  await rejects(service.readCase(OTHER, committed.case_id), "NOT_FOUND");
  assert.deepEqual(await service.listCases(OTHER), []); assert.deepEqual(await service.listRuns(OTHER), []);
  assert.equal(await count(store, "cases", OTHER), 0);
});
test("forged owner and stale binding version cannot authorize a case", async () => {
  const {service, store} = setup(); const {binding} = await seed(service); const command = await commandFor(service, binding);
  await rejects(service.confirm(UID, {...command, binding: {...binding, owner_id: OTHER}}), "NOT_FOUND");
  await rejects(service.confirm(UID, {...command, binding: {...binding, plan_version: 2}}), "STALE_VERSION");
  assert.equal(await count(store, "cases"), 0);
});
test("editing stored input without a version bump fails digest binding", async () => {
  const {service, store} = setup(); const {binding} = await seed(service); const command = await commandFor(service, binding);
  const run = await service.getRun(UID, binding.run_id);
  await store.runTransaction(async (transaction) => { transaction.set("runs", binding.run_id, {...run, input: {...run.input, description: "Altered input"}}); });
  await rejects(service.confirm(UID, command), "STALE_VERSION"); assert.equal(await count(store, "cases"), 0);
});
test("editing plan rationale without a version bump fails digest binding", async () => {
  const {service, store} = setup(); const {binding} = await seed(service); const command = await commandFor(service, binding);
  const run = await service.getRun(UID, binding.run_id); const altered = structuredClone(run);
  altered.workflow_response!.workflow!.plan!.rationale = "Altered but otherwise valid rationale";
  await store.runTransaction(async (transaction) => { transaction.set("runs", binding.run_id, altered); });
  await rejects(service.confirm(UID, command), "STALE_VERSION"); assert.equal(await count(store, "cases"), 0);
});
test("cancelled or superseded in-flight analysis cannot overwrite durable state", async () => {
  const {service} = setup(); const first = await service.createRun(UID, INTAKE);
  await service.cancelRun(UID, first.run_id);
  await rejects(service.completeRun(UID, first.run_id, acceptedWorkflow()), "STALE_VERSION");
  assert.equal((await service.getRun(UID, first.run_id)).status, "INVALIDATED");
  const second = await service.createRun(UID, INTAKE); await service.createRun(UID, INTAKE);
  await rejects(service.completeRun(UID, second.run_id, acceptedWorkflow()), "STALE_VERSION");
});
test("completion winning before disconnect cancellation still invalidates an unconfirmed plan", async () => {
  const {service, store} = setup(); const {binding} = await seed(service);
  const command = await commandFor(service, binding);
  await service.cancelRun(UID, binding.run_id);
  assert.equal((await service.getRun(UID, binding.run_id)).status, "INVALIDATED");
  await rejects(service.prepareConfirmation(UID, binding.run_id, binding), "PLAN_NOT_REVIEWABLE");
  await rejects(service.confirm(UID, command), "PLAN_NOT_REVIEWABLE");
  assert.equal(await count(store, "cases"), 0);
});
test("failed analysis preserves actual completed steps and failure envelope", async () => {
  const {service} = setup(); const run = await service.createRun(UID, INTAKE);
  const failure = acceptedWorkflow(); failure.ok = false; failure.http_status = 504; failure.error = {code: "WORKFLOW_TIMEOUT", message: "The configured deadline elapsed."};
  failure.workflow!.plan = null; failure.workflow!.review = null;
  failure.steps = [{role: "FACTS", attempt: 1, outcome: "SUCCESS", duration_ms: 100, requested_model_id: "gemini-3.1-flash-lite", model_id: "offline-fixture", upstream_status: 200, token_usage: {prompt_tokens: 10, candidate_tokens: 3, thoughts_tokens: 0, total_tokens: 13}, error_code: null}];
  const result = await service.completeRun(UID, run.run_id, failure);
  assert.equal(result.error!.code, "WORKFLOW_TIMEOUT"); assert.deepEqual(result.steps, failure.steps);
  assert.equal((await service.getRun(UID, run.run_id)).status, "ERROR");
});
test("a blocked review or forged amount cannot become a persisted reviewable run", async () => {
  const {service, store} = setup(); const run = await service.createRun(UID, INTAKE);
  const response = acceptedWorkflow(); response.workflow!.review!.verdict = "BLOCKED"; response.workflow!.review!.issues = ["Unresolved reviewer issue."];
  await rejects(service.completeRun(UID, run.run_id, response), "REVIEW_FAILED"); assert.equal(await count(store, "cases"), 0);
  const changed = acceptedWorkflow(); changed.workflow!.plan!.proposed_case.amount_minor = 999;
  await assert.rejects(service.completeRun(UID, run.run_id, changed), /changes the validated amount_minor/);
});
test("NO_ACTION_REQUIRED and unresolved contradictions never gain confirmation", async () => {
  for (const facts of [{...FACTS, receipt_status: "available" as const}, {...FACTS, contradictions: ["Conflicting amount sources."]}]) {
    const {service, store} = setup(); const {binding} = await seed(service, UID, acceptedWorkflow(facts));
    await rejects(service.prepareConfirmation(UID, binding.run_id, binding), "PLAN_NOT_REVIEWABLE");
    assert.equal(await count(store, "cases"), 0);
  }
});
test("transaction failure discards case, approval, audit and idempotency together", async () => {
  const memory = new MemoryCaseStore(); let fail = false;
  const store: CaseStore = {get: memory.get.bind(memory), list: memory.list.bind(memory), runTransaction: (operation) => memory.runTransaction(async (transaction) => { const result = await operation(transaction); if (fail) throw new Error("Injected commit failure"); return result; })};
  const {service} = setup(store); const {binding} = await seed(service); const command = await commandFor(service, binding);
  fail = true; await assert.rejects(service.confirm(UID, command), /Injected commit failure/);
  for (const kind of ["cases", "approvals", "audit", "idempotency"] as const) assert.equal(await count(memory, kind), 0);
  fail = false; await service.confirm(UID, command); assert.equal(await count(memory, "cases"), 1);
});
test("readback outage does not manufacture verified success and recovers without a duplicate write", async () => {
  const memory = new MemoryCaseStore(); let failReads = false;
  const store: CaseStore = {get: async <T>(kind: RecordKind, id: string) => { if (failReads && kind === "cases") throw new Error("Injected independent read outage"); return memory.get<T>(kind, id); }, list: memory.list.bind(memory), runTransaction: memory.runTransaction.bind(memory)};
  const {service} = setup(store); const {binding} = await seed(service); const command = await commandFor(service, binding);
  const committed = await service.confirm(UID, command); failReads = true;
  await assert.rejects(service.readCase(UID, committed.case_id), /Injected independent read outage/);
  const recovery = await service.confirm(UID, command); assert.equal(recovery.replayed, true);
  failReads = false; assert.equal((await service.readCase(UID, committed.case_id)).case_id, committed.case_id);
  assert.equal(await count(memory, "cases"), 1);
});
test("new service instance recovers persisted history and committed case", async () => {
  const {service, store} = setup(); const {binding} = await seed(service); const command = await commandFor(service, binding);
  const result = await service.confirm(UID, command); const restarted = new CaseService({store});
  assert.equal((await restarted.listCases(UID))[0].case_id, result.case_id);
  assert.equal((await restarted.getRun(UID, binding.run_id)).case_id, result.case_id);
  assert.equal((await restarted.readCase(UID, result.case_id)).case_id, result.case_id);
});
test("independent readback detects stored case tampering against the approved plan", async () => {
  const {service, store} = setup(); const {binding} = await seed(service); const result = await service.confirm(UID, await commandFor(service, binding));
  const record = await service.readCase(UID, result.case_id);
  await store.runTransaction(async (transaction) => { transaction.set("cases", result.case_id, {...record, amount_minor: 4300}); });
  await rejects(service.readCase(UID, result.case_id), "STORAGE_INCONSISTENT");
});
test("independent readback requires a successful audit with matching case and owner", async () => {
  const {service, store} = setup(); const {binding} = await seed(service); const result = await service.confirm(UID, await commandFor(service, binding));
  const audit = await store.get<Record<string, unknown>>("audit", result.case_id);
  await store.runTransaction(async (transaction) => { transaction.set("audit", result.case_id, {...audit, owner_id: OTHER}); });
  await rejects(service.readCase(UID, result.case_id), "STORAGE_INCONSISTENT");
});
test("semantic digests are stable across object insertion order and reject nonfinite data", () => {
  assert.equal(sha256({b: [3, {z: null, a: true}], a: "x"}), sha256({a: "x", b: [3, {a: true, z: null}]}));
  assert.throws(() => sha256({value: Infinity}), /finite JSON/);
});
test("disabled runtime requires no Firebase account and has no memory persistence fallback", () => {
  const runtime = createFirebaseRuntime({}); assert.equal(runtime.config.enabled, false); assert.equal(runtime.caseService, null); assert.equal(runtime.verifyIdToken, null);
});
test("emulator config rejects production projects and nonloopback hosts before SDK initialization", () => {
  assert.throws(() => createFirebaseRuntime({OPSCREW_FIREBASE_MODE: "emulator", FIREBASE_PROJECT_ID: "real-project", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080"}), /demo-/);
  assert.throws(() => createFirebaseRuntime({OPSCREW_FIREBASE_MODE: "emulator", FIREBASE_PROJECT_ID: "demo-opscrew", FIREBASE_AUTH_EMULATOR_HOST: "remote.test:9099", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080"}), /127.0.0.1/);
});
