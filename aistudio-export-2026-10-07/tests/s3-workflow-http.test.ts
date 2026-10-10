import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import { test } from "node:test";
import { createApp } from "../server.ts";
import type { CreateAppOptions } from "../server.ts";
import { CaseService, MemoryCaseStore } from "../server/case-service.ts";
import type { FirebaseRuntime } from "../server/firebase-runtime.ts";

const fixture = JSON.parse(readFileSync(new URL("../fixtures/development-cases.json", import.meta.url), "utf8")).cases.find((item: {id: string}) => item.id === "DEV-04");
const input = {...fixture.input, input_version: 700, model_id: "gemini-3.1-flash-lite"};

function setup() {
  const store = new MemoryCaseStore();
  const service = new CaseService({store});
  const runtime: FirebaseRuntime = {
    config: {enabled: true, mode: "emulator", firebase: {apiKey: "offline-public-placeholder", projectId: "demo-opscrew-offline", appId: "offline-placeholder", authDomain: "localhost"}, auth_emulator_url: "http://127.0.0.1:9099"},
    caseService: service,
    // Deliberate offline test verifier, never a runtime identity fallback.
    verifyIdToken: async (token) => { if (token !== "offline-alice" && token !== "offline-bob") throw new Error("Invalid test token"); return {uid: token.slice(8)}; },
  };
  let calls = 0;
  const options: CreateAppOptions = {
    caseRuntime: runtime, apiKeyOverride: "offline-no-network-provider",
    generateContentFn: async () => { calls++; return {text: JSON.stringify(fixture.facts)}; },
    planningGenerateContentFn: async (args) => {
      calls++;
      const payload = JSON.parse(args.promptPayload), decision = payload.deterministic_decision, facts = payload.validated_facts;
      return {text: JSON.stringify(args.role === "REVIEWER" ? {verdict: "PASS", issues: [], citation_ids: decision.citations.map((c: {clause_id: string}) => c.clause_id)} : {
        branch: decision.branch, action: decision.allowed_action, proposed_case: {...facts, case_type: decision.branch, evidence_requirements: decision.evidence_requirements,
          missing_information: undefined, contradictions: undefined}, citation_ids: decision.citations.map((c: {clause_id: string}) => c.clause_id), rationale: "Offline integration fixture.",
      })};
    },
  };
  return {store, service, runtime, options, calls: () => calls};
}
async function serverFor(options: CreateAppOptions, check: (url: string) => Promise<void>) {
  const server: Server = await new Promise(resolve => { const owned = createApp(options).listen(0, "127.0.0.1", () => resolve(owned)); });
  const address = server.address(); assert(address && typeof address === "object");
  try { await check(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}
async function request(base: string, path: string, body?: unknown, token?: string) {
  const response = await fetch(base + path, {method: body === undefined ? "GET" : "POST", headers: {"content-type": "application/json", ...(token ? {Authorization: `Bearer ${token}`} : {})}, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
  return {status: response.status, body: await response.json()};
}

test("S3 unauthenticated analysis and case commands make no model calls or durable writes", async () => {
  const state = setup();
  await serverFor(state.options, async base => {
    for (const path of ["/api/workflow", "/api/analyze", "/api/cases"]) {
      assert.equal((await request(base, path, input)).status, 401);
      assert.equal((await request(base, path, input, "spoofed-token")).status, 401);
    }
  });
  assert.equal(state.calls(), 0); assert.deepEqual(await state.store.list("runs", "alice"), []);
});

test("S3 persists trusted UID and server revision, denies other owner, then independently reads one confirmed case", async () => {
  const state = setup();
  await serverFor(state.options, async base => {
    const run = await request(base, "/api/workflow", input, "offline-alice");
    assert.equal(run.status, 200); assert.equal(run.body.ok, true);
    const binding = run.body.workflow.binding;
    assert.equal(binding.owner_id, "alice"); assert.equal(binding.input_version, 1);
    assert.equal((await request(base, `/api/runs/${run.body.run_id}`, undefined, "offline-bob")).status, 404);
    const prepared = await request(base, `/api/runs/${run.body.run_id}/confirmation`, {binding}, "offline-alice");
    assert.equal(prepared.status, 200);
    assert.equal((await state.store.list("cases", "alice")).length, 0);
    const command = {approval_id: prepared.body.confirmation.approval_id, binding, idempotency_key: "offline-stable-command", confirmed: true};
    const committed = await request(base, "/api/cases", command, "offline-alice");
    assert.equal(committed.status, 200); assert.equal(committed.body.committed, true);
    assert(!("verified" in committed.body)); assert(!("case" in committed.body));
    const readback = await request(base, `/api/cases/${committed.body.case_id}`, undefined, "offline-alice");
    assert.equal(readback.status, 200); assert.equal(readback.body.verified, true);
    assert.equal(readback.body.case.amount_minor, 3800);
    assert.equal((await request(base, `/api/cases/${committed.body.case_id}`, undefined, "offline-bob")).status, 404);
    assert.equal((await request(base, "/api/cases", command, "offline-alice")).body.case_id, committed.body.case_id);
  });
  assert.equal(state.calls(), 3); assert.equal((await state.store.list("cases", "alice")).length, 1);
});

test("S3 storage failure before analysis stops model calls; persistence failure cannot return a reviewable result", async () => {
  const state = setup();
  state.store.runTransaction = async () => { throw new Error("private database diagnostic"); };
  await serverFor(state.options, async base => {
    const result = await request(base, "/api/workflow", input, "offline-alice");
    assert.equal(result.status, 503); assert.equal(result.body.error.code, "CASE_STORAGE_UNAVAILABLE");
    assert(!JSON.stringify(result.body).includes("private database"));
  });
  assert.equal(state.calls(), 0);
  const after = setup();
  after.service.completeRun = async () => { throw new Error("private result failure"); };
  await serverFor(after.options, async base => {
    const result = await request(base, "/api/workflow", input, "offline-alice");
    assert.equal(result.status, 503); assert(!result.body.workflow); assert.equal(result.body.ok, false);
  });
  assert.equal(after.calls(), 3);
});

test("S3 stores bounded model failure for owner recovery without creating a case", async () => {
  const state = setup();
  await serverFor({...state.options, generateContentFn: async () => {throw new Error("offline model failure");}}, async base => {
    const failed = await request(base, "/api/workflow", input, "offline-alice");
    assert.equal(failed.body.ok, false);
    const history = await request(base, "/api/runs", undefined, "offline-alice");
    assert.equal(history.body.runs.length, 1); assert.equal(history.body.runs[0].status, "ERROR");
    assert.equal(history.body.runs[0].workflow_response.ok, false);
    assert.equal((await state.store.list("cases", "alice")).length, 0);
  });
});
