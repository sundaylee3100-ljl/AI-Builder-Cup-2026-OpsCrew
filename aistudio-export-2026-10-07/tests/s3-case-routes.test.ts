import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import type { Server } from "node:http";
import { CaseService, MemoryCaseStore } from "../server/case-service.ts";
import type { CaseStore, RecordKind } from "../server/case-service.ts";
import { createCaseRouter, withCaseDeadline } from "../server/case-routes.ts";
import { CaseServiceError } from "../server/case-service.ts";
import { ALLOWED_ACTION, CONTRACT_VERSIONS, POLICY_VERSION } from "../src/domain/contracts.ts";
import type { ExpenseFacts, VersionBinding } from "../src/domain/contracts.ts";
import { evaluatePolicy } from "../src/domain/policy.ts";
import type { WorkflowResponse } from "../server/planning-contracts.ts";

const UID = "synthetic-route-owner", OTHER = "synthetic-other-route-owner";
const TOKEN = "offline-owner-token", OTHER_TOKEN = "offline-other-token";
function responseFixture(): WorkflowResponse {
  const facts: ExpenseFacts = {amount_minor: 4200, currency: "USD", receipt_status: "missing", description: "Synthetic lunch", employee_identifier: "SYN-EMP-01", missing_information: [], contradictions: []};
  const decision = evaluatePolicy(facts), binding: VersionBinding = {run_id: "preview", owner_id: "local-preview", input_version: 1, facts_version: 1, policy_version: POLICY_VERSION, plan_id: "preview-plan", plan_version: 1};
  return {ok: true, run_id: "preview", timestamp: "2026-10-10T05:00:00.000Z", requested_model_id: "gemini-3.1-flash-lite", model_id: "offline-fixture", http_status: 200, upstream_status: 200, facts,
    workflow: {stage: "S2", status: "REVIEWABLE", decision, execution_authorized: false, binding, steps: [], planner_rationale: "Synthetic policy supports the case.",
      plan: {schema_version: CONTRACT_VERSIONS.plan, ...binding, action: ALLOWED_ACTION, proposed_case: {case_type: "EVIDENCE_REQUEST", employee_identifier: facts.employee_identifier!, amount_minor: facts.amount_minor!, currency: "USD", receipt_status: "missing", description: facts.description, evidence_requirements: decision.evidence_requirements}, citations: decision.citations, rationale: "Create a synthetic evidence request after human confirmation."},
      review: {schema_version: CONTRACT_VERSIONS.review, ...binding, review_id: "offline-review", verdict: "PASS", issues: [], citations: decision.citations, reviewed_at: "2026-10-10T05:00:00.000Z"},
    }};
}
async function fixture(context: any, options: {store?: CaseStore; disabled?: boolean} = {}) {
  const store = options.store ?? new MemoryCaseStore(), service = new CaseService({store});
  const app = express(); app.use(express.json());
  app.use("/api", createCaseRouter({caseService: options.disabled ? null : service, verifyIdToken: options.disabled ? null : async (token) => {
    if (token === TOKEN) return {uid: UID}; if (token === OTHER_TOKEN) return {uid: OTHER};
    throw new Error(`Private provider token failure: ${token}`);
  }}));
  const server = await new Promise<Server>((resolve) => { const value = app.listen(0, "127.0.0.1", () => resolve(value)); });
  context.after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}`;
  async function call(path: string, body?: unknown, token: string | null = TOKEN) {
    const result = await fetch(`${url}${path}`, {method: body === undefined ? "GET" : "POST", headers: {...(token ? {authorization: `Bearer ${token}`} : {}), ...(body === undefined ? {} : {"content-type": "application/json"})}, ...(body === undefined ? {} : {body: JSON.stringify(body)}), signal: AbortSignal.timeout(5_000)});
    return {status: result.status, json: await result.json() as any};
  }
  async function seed() {
    const run = await service.createRun(UID, {synthetic_only: true, description: "Synthetic lunch USD 42 with a missing receipt.", employee_identifier: "SYN-EMP-01", amount_usd: 42, receipt_status: "missing"});
    const result = await service.completeRun(UID, run.run_id, responseFixture()); return result.workflow!.binding;
  }
  return {store, service, call, seed};
}

test("unconfigured routes fail closed without creating a memory fallback", async (context) => {
  const {call, store} = await fixture(context, {disabled: true}); const result = await call("/api/cases");
  assert.equal(result.status, 503); assert.equal(result.json.error.code, "CASE_BACKEND_NOT_CONFIGURED"); assert.equal((await store.list("cases", UID)).length, 0);
});
test("case APIs require a valid verified bearer session and never echo a rejected token", async (context) => {
  const {call} = await fixture(context);
  for (const token of [null, "untrusted-session-token"]) {
    const result = await call("/api/cases", undefined, token); assert.equal(result.status, 401); assert.equal(result.json.error.code, "UNAUTHENTICATED");
    assert.equal(JSON.stringify(result.json).includes("untrusted-session-token"), false); assert.equal(JSON.stringify(result.json).includes("Private provider"), false);
  }
});
test("owned preparation, explicit commit and independent GET provide a verified synthetic receipt", async (context) => {
  const {call, seed} = await fixture(context); const binding = await seed();
  const prepare = await call(`/api/runs/${binding.run_id}/confirmation`, {binding}); assert.equal(prepare.status, 200);
  const command = {approval_id: prepare.json.confirmation.approval_id, binding, confirmed: true, idempotency_key: "route-recovery-command"};
  const committed = await call("/api/cases", command); assert.equal(committed.status, 200); assert.equal(committed.json.committed, true); assert.equal(committed.json.verified, undefined);
  const read = await call(`/api/cases/${committed.json.case_id}`); assert.equal(read.status, 200); assert.equal(read.json.verified, true); assert.equal(read.json.case.owner_id, UID); assert.equal(read.json.case.approval_id, committed.json.approval_id);
  assert.equal((await call("/api/cases")).json.cases.length, 1); assert.equal((await call("/api/runs")).json.runs[0].status, "SUBMITTED");
  assert.equal((await call("/api/cases", command)).json.replayed, true);
});
test("caller-supplied ownership, approved flags and plan mutations are rejected before case writes", async (context) => {
  const {call, seed, store} = await fixture(context); const binding = await seed();
  const prep = await call(`/api/runs/${binding.run_id}/confirmation`, {binding, owner_id: UID}); assert.equal(prep.status, 400);
  const intent = (await call(`/api/runs/${binding.run_id}/confirmation`, {binding})).json.confirmation;
  const command = {approval_id: intent.approval_id, binding, idempotency_key: "strict-command-key", confirmed: true};
  for (const extra of [{owner_id: UID}, {approved: true}, {action: "pay_expense"}, {plan: {amount_minor: 1}}]) {
    const result = await call("/api/cases", {...command, ...extra}); assert.equal(result.status, 400);
  }
  assert.equal((await store.list("cases", UID)).length, 0);
});
test("cross-session HTTP read/write returns the same not-found response as missing owned records", async (context) => {
  const {call, seed} = await fixture(context); const binding = await seed();
  assert.equal((await call(`/api/runs/${binding.run_id}`, undefined, OTHER_TOKEN)).status, 404);
  assert.equal((await call(`/api/runs/${binding.run_id}/confirmation`, {binding}, OTHER_TOKEN)).status, 404);
  assert.deepEqual((await call("/api/runs", undefined, OTHER_TOKEN)).json.runs, []);
  assert.deepEqual((await call("/api/cases", undefined, OTHER_TOKEN)).json.cases, []);
});
test("reject and invalidate routes prevent earlier intents from producing cases", async (context) => {
  const {call, seed, store} = await fixture(context);
  for (const action of ["reject", "invalidate"]) {
    const binding = await seed(); const intent = (await call(`/api/runs/${binding.run_id}/confirmation`, {binding})).json.confirmation;
    const marked = await call(`/api/runs/${binding.run_id}/${action}`, {binding}); assert.equal(marked.status, 200);
    const result = await call("/api/cases", {approval_id: intent.approval_id, binding, idempotency_key: `route-${action}-key`, confirmed: true});
    assert.equal(result.status, 409); assert.equal(result.json.error.code, "PLAN_NOT_REVIEWABLE");
  }
  assert.equal((await store.list("cases", UID)).length, 0);
});
test("readback storage failure stays unverified while exact replay returns the existing case", async (context) => {
  const memory = new MemoryCaseStore(); let failRead = false;
  const store: CaseStore = {get: async <T>(kind: RecordKind, id: string) => { if (failRead && kind === "cases") throw new Error("private database connection detail"); return memory.get<T>(kind, id); }, list: memory.list.bind(memory), runTransaction: memory.runTransaction.bind(memory)};
  const {call, seed} = await fixture(context, {store}); const binding = await seed(); const intent = (await call(`/api/runs/${binding.run_id}/confirmation`, {binding})).json.confirmation;
  const command = {approval_id: intent.approval_id, binding, idempotency_key: "outage-recovery-key", confirmed: true};
  const committed = await call("/api/cases", command); failRead = true;
  const failed = await call(`/api/cases/${committed.json.case_id}`); assert.equal(failed.status, 503); assert.equal(failed.json.verified, undefined); assert.equal(JSON.stringify(failed.json).includes("private database"), false);
  const recovered = await call("/api/cases", command); assert.equal(recovered.json.replayed, true); assert.equal(recovered.json.case_id, committed.json.case_id);
  failRead = false; assert.equal((await call(`/api/cases/${committed.json.case_id}`)).json.verified, true); assert.equal((await memory.list("cases", UID)).length, 1);
});
test("storage deadline is bounded and explicitly preserves unknown commit outcome", async () => {
  let finish!: (value: string) => void;
  const operation = new Promise<string>((resolve) => { finish = resolve; });
  await assert.rejects(withCaseDeadline(operation, 10), (error: unknown) => error instanceof CaseServiceError && error.status === 503 && error.code === "CASE_STORAGE_TIMEOUT");
  // Completing later is allowed: caller must retry the same idempotent command to discover the result.
  finish("late-committed-result"); assert.equal(await operation, "late-committed-result");
});
test("read-only recovery endpoint cannot execute an uncommitted command and recovers only existing records", async (context) => {
  const {call, seed, store} = await fixture(context); const binding = await seed();
  const intent = (await call(`/api/runs/${binding.run_id}/confirmation`, {binding})).json.confirmation;
  const command = {approval_id: intent.approval_id, binding, idempotency_key: "read-only-route-key", confirmed: true};
  const notCommitted = await call("/api/cases/recover", command); assert.equal(notCommitted.status, 404); assert.equal(notCommitted.json.error.code, "CASE_NOT_COMMITTED");
  for (const kind of ["cases", "approvals", "audit", "idempotency"] as const) assert.equal((await store.list(kind, UID)).length, 0);
  const committed = await call("/api/cases", command); assert.equal(committed.status, 200);
  const recovered = await call("/api/cases/recover", command); assert.equal(recovered.status, 200); assert.equal(recovered.json.case_id, committed.json.case_id); assert.equal(recovered.json.approval_id, committed.json.approval_id);
  for (const kind of ["cases", "approvals", "audit", "idempotency"] as const) assert.equal((await store.list(kind, UID)).length, 1);
});
