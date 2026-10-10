import assert from "node:assert/strict";
import type { Server } from "node:http";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createApp, redactResponse } from "../server.ts";
import type { CreateAppOptions } from "../server.ts";
import type { ExpenseFacts } from "../src/domain/contracts.ts";
import type { PlanningGenerateContentArgs } from "../server/planning-contracts.ts";

const fixture = JSON.parse(readFileSync(new URL("../fixtures/development-cases.json", import.meta.url), "utf8")).cases.find((item: { id: string }) => item.id === "DEV-04");
const input = { ...fixture.input, input_version: 7, model_id: "gemini-3.1-flash-lite" };
const offlineKey = "offline-provider-never-used-on-network";

function proposal(args: PlanningGenerateContentArgs) {
  const payload = JSON.parse(args.promptPayload);
  const decision = payload.deterministic_decision;
  const facts: ExpenseFacts = payload.validated_facts;
  return args.role === "REVIEWER" ? {
    verdict: "PASS", issues: [], citation_ids: decision.citations.map((citation: { clause_id: string }) => citation.clause_id),
  } : {
    branch: decision.branch, action: decision.allowed_action,
    proposed_case: decision.case_eligible ? {
      case_type: decision.branch, employee_identifier: facts.employee_identifier,
      amount_minor: facts.amount_minor, currency: facts.currency, receipt_status: facts.receipt_status,
      description: facts.description, evidence_requirements: decision.evidence_requirements,
    } : null,
    citation_ids: decision.citations.map((citation: { clause_id: string }) => citation.clause_id),
    rationale: "Offline synthetic receipt evidence request; human confirmation is still required.",
  };
}

function defaults(): CreateAppOptions {
  return {
    apiKeyOverride: offlineKey,
    generateContentFn: async () => ({ text: JSON.stringify(fixture.facts), modelVersion: "offline-fixture" }),
    planningGenerateContentFn: async (args) => ({ text: JSON.stringify(proposal(args)), modelVersion: "offline-fixture" }),
    planningRetryDelayMs: 0,
  };
}

async function withServer(options: CreateAppOptions, check: (base: string) => Promise<void>) {
  const app = createApp(options);
  const server: Server = await new Promise((resolve) => { const owned = app.listen(0, "127.0.0.1", () => resolve(owned)); });
  const address = server.address();
  assert(address && typeof address === "object");
  try { await check(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

async function post(base: string, body: unknown = input) {
  const response = await fetch(`${base}/api/workflow`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  return { status: response.status, body: await response.json() };
}

test("Workflow HTTP joins trusted extraction, distinct planning/review and service-generated bindings without execution", async () => {
  const calls: string[] = [];
  await withServer({ ...defaults(), planningGenerateContentFn: async (args) => {
    calls.push(args.role);
    return { text: JSON.stringify(proposal(args)), modelVersion: "offline-fixture" };
  } }, async (base) => {
    const { status, body } = await post(base);
    assert.equal(status, 200); assert.equal(body.ok, true);
    assert.deepEqual(calls, ["PLANNER", "REVIEWER"]);
    assert.equal(body.workflow.status, "REVIEWABLE");
    assert.equal(body.workflow.decision.branch, "EVIDENCE_REQUEST");
    assert.equal(body.workflow.plan.proposed_case.amount_minor, 3800);
    assert.equal(body.workflow.binding.input_version, 7);
    assert.equal(body.workflow.binding.owner_id, "local-preview");
    assert.equal(body.workflow.binding.run_id, body.run_id);
    assert.equal(body.workflow.execution_authorized, false);
    assert.deepEqual(body.workflow.steps.map((step: { role: string }) => step.role), ["FACTS", "PLANNER", "REVIEWER"]);
    assert.deepEqual(body.steps, body.workflow.steps);
    assert(!("case_id" in body)); assert(!("approval" in body));
  });
});

test("Workflow HTTP rejects client facts, owner, approval, action, invalid types and oversized input before any model call", async () => {
  let calls = 0;
  await withServer({ ...defaults(), generateContentFn: async () => { calls++; return { text: "{}" }; } }, async (base) => {
    for (const body of [
      { ...input, owner_id: "someone" }, { ...input, facts: fixture.facts }, { ...input, approved: true },
      { ...input, action: "transfer_payment" }, { ...input, input_version: 0 },
      { ...input, input_version: "2" }, { ...input, description: true }, { ...input, description: "x".repeat(4001) }, [],
    ]) {
      const result = await post(base, body);
      assert.equal(result.status, 400); assert.equal(result.body.error.code, "INVALID_WORKFLOW_INPUT");
      assert.deepEqual(result.body.steps, []);
    }
    assert.equal(calls, 0);
  });
});

test("Missing key and invalid extraction fail before planning, preserving attempted facts telemetry", async () => {
  let planningCalls = 0;
  const planner = async () => { planningCalls++; return { text: "{}" }; };
  await withServer({ ...defaults(), apiKeyOverride: "", planningGenerateContentFn: planner }, async (base) => {
    const { status, body } = await post(base);
    assert.equal(status, 500); assert.equal(body.error.code, "MISSING_API_KEY");
    assert.equal(body.facts, null); assert.equal(body.workflow, null); assert.deepEqual(body.steps, []);
  });
  await withServer({ ...defaults(), generateContentFn: async () => ({ text: "not-json" }), planningGenerateContentFn: planner }, async (base) => {
    const { status, body } = await post(base);
    assert.equal(status, 422); assert.equal(body.error.code, "INVALID_JSON_FROM_MODEL");
    assert.equal(body.workflow, null); assert.equal(body.steps.length, 1);
    assert.equal(body.steps[0].outcome, "ERROR"); assert.equal(body.steps[0].upstream_status, 200);
  });
  assert.equal(planningCalls, 0);
});

test("Every extraction retry is visible and secret-echoing provider errors are redacted", async () => {
  let attempts = 0;
  await withServer({ ...defaults(), generateContentFn: async () => {
    if (++attempts === 1) throw Object.assign(new Error(`Provider echoed ${offlineKey}`), { status: 429 });
    return { text: JSON.stringify(fixture.facts) };
  } }, async (base) => {
    const { body } = await post(base);
    assert.equal(body.ok, true); assert.equal(attempts, 2);
    assert.deepEqual(body.workflow.steps.map((step: { role: string; attempt: number }) => [step.role, step.attempt]), [["FACTS", 1], ["FACTS", 2], ["PLANNER", 1], ["REVIEWER", 1]]);
    assert.equal(body.workflow.steps[0].upstream_status, 429);
    assert.equal(body.workflow.steps[0].token_usage, null);
  });
  await withServer({ ...defaults(), generateContentFn: async () => { throw Object.assign(new Error(`Provider echoed ${offlineKey}`), { status: 403 }); } }, async (base) => {
    const { status, body } = await post(base);
    // Preserve the original AI Studio proxy compatibility: 403 transport maps
    // to JSON 500 while the actual upstream status remains explicit.
    assert.equal(status, 500); assert.equal(body.http_status, 403); assert.equal(body.upstream_status, 403);
    assert.equal(body.steps.length, 1);
    assert(!JSON.stringify(body).includes(offlineKey)); assert.match(body.error.message, /REDACTED_KEY/);
  });
});

test("Planner veto preserves actual facts and partial evidence but hides unsafe plan and stops Reviewer", async () => {
  const roles: string[] = [];
  await withServer({ ...defaults(), planningGenerateContentFn: async (args) => {
    roles.push(args.role); const output = proposal(args);
    return { text: JSON.stringify({ ...output, action: "transfer_payment" }) };
  } }, async (base) => {
    const { status, body } = await post(base);
    assert.equal(status, 422); assert.equal(body.error.code, "PLANNER_POLICY_VETO");
    assert.equal(body.facts.amount_minor, 3800); assert.equal(body.workflow.status, "BLOCKED");
    assert.equal(body.workflow.plan, null); assert.equal(body.workflow.review, null);
    assert.equal(body.workflow.execution_authorized, false);
    assert.deepEqual(roles, ["PLANNER"]); assert.equal(body.workflow.steps.length, 2);
  });
});

test("Workflow timeout bounds a non-cooperative extraction provider and never calls planning", async () => {
  let planningCalls = 0;
  await withServer({ ...defaults(), routeTimeoutMs: 20, workflowTimeoutMs: 100,
    generateContentFn: async () => new Promise(() => {}),
    planningGenerateContentFn: async () => { planningCalls++; return { text: "{}" }; },
  }, async (base) => {
    const started = Date.now(); const { body } = await post(base);
    assert.equal(body.http_status, 504); assert.equal(body.error.code, "GEMINI_REQUEST_TIMEOUT");
    assert.equal(body.steps[0].error_code, "GEMINI_REQUEST_TIMEOUT");
    assert.equal(body.steps.length, 1); assert(Date.now() - started < 1000);
    assert.equal(planningCalls, 0);
  });
  await withServer({ ...defaults(), generateContentFn: async () => { throw new DOMException("Offline SDK deadline", "TimeoutError"); } }, async (base) => {
    const { body } = await post(base);
    assert.equal(body.http_status, 504); assert.equal(body.error.code, "GEMINI_REQUEST_TIMEOUT");
    assert.equal(body.steps[0].error_code, "GEMINI_REQUEST_TIMEOUT");
    assert.equal(body.steps.length, 1);
  });
});

test("Public response redaction traverses nested arrays and JSON strings without changing values of other fields", () => {
  const disguised = "AQ." + "k".repeat(42);
  assert.deepEqual(redactResponse({ facts: [offlineKey, disguised], amount: 3800, missing: null }, offlineKey),
    { facts: ["[REDACTED_KEY]", "[REDACTED_KEY]"], amount: 3800, missing: null });
});

test("Overall workflow deadline during planning remains a timeout with validated facts and no review", async () => {
  const roles: string[] = [];
  await withServer({ ...defaults(), workflowTimeoutMs: 40,
    planningGenerateContentFn: async (args) => { roles.push(args.role); return new Promise(() => {}); },
  }, async (base) => {
    const started = Date.now(); const { status, body } = await post(base);
    assert.equal(status, 500); // Existing AI Studio transport compatibility for JSON 504.
    assert.equal(body.http_status, 504); assert.equal(body.error.code, "GEMINI_REQUEST_TIMEOUT");
    assert.equal(body.facts.amount_minor, 3800);
    assert.equal(body.workflow.status, "BLOCKED");
    assert.equal(body.workflow.plan, null); assert.equal(body.workflow.review, null);
    assert.equal(body.workflow.execution_authorized, false);
    assert.deepEqual(roles, ["PLANNER"]);
    assert.deepEqual(body.steps.map((step: { role: string }) => step.role), ["FACTS", "PLANNER"]);
    assert.equal(body.steps[1].error_code, "GEMINI_REQUEST_TIMEOUT");
    assert(Date.now() - started < 1000);
  });
});

test("Malformed JSON and unknown API paths do not echo credentials or invoke a provider", async () => {
  let calls = 0;
  await withServer({ ...defaults(), generateContentFn: async () => { calls++; return { text: "{}" }; } }, async (base) => {
    const malformed = await fetch(`${base}/api/workflow`, { method: "POST", headers: { "content-type": "application/json" }, body: `{"description":"${offlineKey}",` });
    assert.equal(malformed.status, 400);
    const text = await malformed.text(); assert(!text.includes(offlineKey));
    assert.equal(JSON.parse(text).error.code, "BAD_JSON_REQUEST");
    const unknown = await fetch(`${base}/api/${offlineKey}`);
    assert.equal(unknown.status, 404); assert(!(await unknown.text()).includes(offlineKey));
    assert.equal(calls, 0);
  });
});

test("Unsupported extracted amounts and receipt availability fail before either planning role", async () => {
  let planningCalls = 0;
  for (const mutation of [{ amount_minor: 1000 }, { receipt_status: "available" }]) {
    await withServer({ ...defaults(),
      generateContentFn: async () => ({ text: JSON.stringify({ ...fixture.facts, ...mutation }) }),
      planningGenerateContentFn: async () => { planningCalls++; return { text: "{}" }; },
    }, async (base) => {
      const { status, body } = await post(base);
      assert.equal(status, 422); assert.equal(body.ok, false);
      assert.equal(body.facts, null); assert.equal(body.workflow, null);
      assert.equal(body.steps.length, 1); assert.equal(body.steps[0].outcome, "ERROR");
      assert.equal(body.steps[0].upstream_status, 200);
    });
  }
  assert.equal(planningCalls, 0);
});
