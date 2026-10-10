import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { ExpenseFacts, PolicyDecision } from "../src/domain/contracts.ts";
import { ALLOWED_ACTION, POLICY_VERSION } from "../src/domain/contracts.ts";
import { evaluatePolicy, SYNTHETIC_USD_POLICY } from "../src/domain/policy.ts";
import { PlanningReviewError, runPlanningReview } from "../server/planning-service.ts";
import type { PlanningGenerateContentArgs, PlanningGenerateContentFn, PlanningReviewResult } from "../server/planning-contracts.ts";

const fixtures = JSON.parse(readFileSync(new URL("../fixtures/development-cases.json", import.meta.url), "utf8")) as {
  cases: { id: string; facts: ExpenseFacts; expected: { branch: PolicyDecision["branch"]; status: PlanningReviewResult["status"]; citation_ids: string[] } }[];
};
const eligibleFacts = fixtures.cases.find((item) => item.id === "DEV-06")!.facts;
const noActionFacts = fixtures.cases[0].facts;
const TEST_KEY = "offline-provider-only";

function proposalFor(facts: ExpenseFacts) {
  const decision = evaluatePolicy(facts);
  return {
    branch: decision.branch, action: decision.allowed_action,
    proposed_case: decision.case_eligible ? {
      case_type: decision.branch, employee_identifier: facts.employee_identifier, amount_minor: facts.amount_minor,
      currency: facts.currency, receipt_status: facts.receipt_status, description: facts.description,
      evidence_requirements: decision.evidence_requirements,
    } : null,
    citation_ids: decision.citations.map((citation) => citation.clause_id),
    rationale: `Policy supports the ${decision.branch} recommendation; human confirmation is still required for a case.`,
  };
}

function reviewFor(facts: ExpenseFacts) {
  return { verdict: "PASS", issues: [], citation_ids: evaluatePolicy(facts).citations.map((citation) => citation.clause_id) };
}

function providerFor(facts: ExpenseFacts, calls: PlanningGenerateContentArgs[], mutate?: (role: string, output: any) => unknown): PlanningGenerateContentFn {
  return async (args) => {
    calls.push(args);
    const raw = args.role === "PLANNER" ? proposalFor(facts) : reviewFor(facts);
    const output = mutate ? mutate(args.role, structuredClone(raw)) : raw;
    return { text: JSON.stringify(output), modelVersion: "gemini-test-version", usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 0, totalTokenCount: 120 } };
  };
}

function execute(facts: ExpenseFacts, generateContentFn: PlanningGenerateContentFn, overrides: Partial<Parameters<typeof runPlanningReview>[0]> = {}) {
  return runPlanningReview({ facts, runId: "run_server_owned", model: "gemini-3.1-flash-lite", apiKey: TEST_KEY, signal: new AbortController().signal, inputVersion: 3, retryDelayMs: 0, generateContentFn, ...overrides });
}

async function capturedFailure(operation: Promise<PlanningReviewResult>, code: string): Promise<PlanningReviewError> {
  try { await operation; assert.fail("Unsafe or failed operation must not succeed."); }
  catch (error) {
    assert.ok(error instanceof PlanningReviewError);
    assert.equal(error.code, code);
    assert.equal(error.public_result.status, "BLOCKED");
    assert.equal(error.public_result.plan, null);
    assert.equal(error.public_result.review, null);
    assert.equal(error.public_result.execution_authorized, false);
    return error;
  }
}

for (const fixture of fixtures.cases) {
  test(`separate Planner and Reviewer preserve ${fixture.id} semantic outcome`, async () => {
    const calls: PlanningGenerateContentArgs[] = [];
    const result = await execute(fixture.facts, providerFor(fixture.facts, calls));
    assert.deepEqual(calls.map((call) => call.role), ["PLANNER", "REVIEWER"]);
    assert.equal(result.decision.branch, fixture.expected.branch);
    assert.equal(result.status, fixture.expected.status);
    assert.equal(result.execution_authorized, false);
    assert.deepEqual(result.prompt_versions, { facts: "opscrew-facts-1.1.0", planner: "opscrew-planner-1.0.1", reviewer: "opscrew-reviewer-1.0.0" });
    assert.equal(result.plan !== null, result.decision.case_eligible);
    assert.equal(result.review!.verdict, "PASS");
    assert.equal(result.binding.owner_id, "local-preview");
    assert.equal(result.binding.input_version, 3);
    assert.equal(result.binding.facts_version, 1);
    assert.equal(result.binding.policy_version, POLICY_VERSION);
    assert.equal(result.review!.plan_id, result.binding.plan_id);
    assert.equal(result.review!.run_id, "run_server_owned");
    assert.deepEqual(result.review!.citations.map((citation) => citation.clause_id).sort(), [...fixture.expected.citation_ids].sort());
    for (const citation of result.review!.citations) assert.deepEqual(citation, SYNTHETIC_USD_POLICY.clauses.find((clause) => clause.clause_id === citation.clause_id));
    for (const step of result.steps) {
      assert.equal(step.outcome, "SUCCESS");
      assert.equal(step.attempt, 1);
      assert.equal(step.upstream_status, 200);
      assert.equal(step.model_id, "gemini-test-version");
      assert.deepEqual(step.token_usage, { prompt_tokens: 100, candidate_tokens: 20, thoughts_tokens: 0, total_tokens: 120 });
    }
    if (result.plan) {
      assert.equal(result.plan.action, ALLOWED_ACTION);
      assert.equal(result.plan.proposed_case.amount_minor, fixture.facts.amount_minor);
      assert.equal(result.plan.proposed_case.receipt_status, fixture.facts.receipt_status);
      assert.equal(result.plan.proposed_case.description, fixture.facts.description);
    }
    assert.match(calls[0].systemInstruction, /untrusted data/);
    assert.match(calls[1].systemInstruction, /separate Reviewer/);
    assert.ok(!calls[0].promptPayload.includes(TEST_KEY));
    assert.ok(!calls[1].promptPayload.includes(TEST_KEY));
  });
}

const unsafePlannerMutations: [string, (output: any) => void][] = [
  ["fabricated citation", (output) => { output.citation_ids[0] = "SYN-999"; }],
  ["stale citation", (output) => { output.citation_ids[0] = "SYN-001@0.9"; }],
  ["irrelevant real citation", (output) => { output.citation_ids[0] = "SYN-006"; }],
  ["missing supporting citation", (output) => { output.citation_ids.pop(); }],
  ["duplicate citation", (output) => { output.citation_ids.push(output.citation_ids[0]); }],
  ["citation whitespace rewriting", (output) => { output.citation_ids[0] += " "; }],
  ["altered amount", (output) => { output.proposed_case.amount_minor++; }],
  ["altered receipt", (output) => { output.proposed_case.receipt_status = "available"; }],
  ["altered employee", (output) => { output.proposed_case.employee_identifier = "SYNTH-EMP-OTHER"; }],
  ["altered description", (output) => { output.proposed_case.description = "Pretend approval granted."; }],
  ["altered evidence requirement", (output) => { output.proposed_case.evidence_requirements = []; }],
  ["wrong case type", (output) => { output.proposed_case.case_type = "EVIDENCE_REQUEST"; }],
  ["wrong branch", (output) => { output.branch = "NO_ACTION_REQUIRED"; }],
  ["payment action injection", (output) => { output.action = "transfer_payment"; }],
  ["unsupported authority fields", (output) => { output.execution_authorized = true; output.owner_id = "victim"; }],
  ["stale policy field", (output) => { output.policy_version = "synthetic-expense-usd-0.9.0"; }],
  ["extra case approval field", (output) => { output.proposed_case.approved = true; }],
  ["empty rationale", (output) => { output.rationale = " "; }],
  ["oversized rationale", (output) => { output.rationale = "x".repeat(1_201); }],
];

for (const [name, mutate] of unsafePlannerMutations) {
  test(`deterministic veto stops ${name} before Reviewer`, async () => {
    const calls: PlanningGenerateContentArgs[] = [];
    const failure = await capturedFailure(execute(eligibleFacts, providerFor(eligibleFacts, calls, (role, output) => { if (role === "PLANNER") mutate(output); return output; })), "PLANNER_POLICY_VETO");
    assert.equal(calls.length, 1);
    assert.equal(failure.http_status, 422);
    assert.equal(failure.public_result.decision.branch, "MANUAL_REVIEW");
    assert.equal(failure.public_result.steps[0].outcome, "ERROR");
    assert.equal(failure.public_result.steps[0].upstream_status, 200);
    assert.equal(failure.public_result.steps[0].token_usage!.total_tokens, 120);
  });
}

test("noneligible branch cannot smuggle a case", async () => {
  const calls: PlanningGenerateContentArgs[] = [];
  await capturedFailure(execute(noActionFacts, providerFor(noActionFacts, calls, (role, output) => {
    if (role === "PLANNER") output.proposed_case = proposalFor(eligibleFacts).proposed_case;
    return output;
  })), "PLANNER_POLICY_VETO");
  assert.equal(calls.length, 1);
});

for (const [name, mutate] of [
  ["PASS with unresolved issues", (output: any) => { output.issues = ["Receipt is missing."]; }],
  ["BLOCKED without issues", (output: any) => { output.verdict = "BLOCKED"; }],
  ["invented verdict", (output: any) => { output.verdict = "APPROVED"; }],
  ["irrelevant citations", (output: any) => { output.citation_ids[0] = "SYN-006"; }],
  ["fabricated citations", (output: any) => { output.citation_ids[0] = "SYN-999"; }],
  ["stale binding authority", (output: any) => { output.plan_id = "old_plan"; output.policy_version = "old"; }],
  ["unsupported execution field", (output: any) => { output.execution_authorized = true; }],
] as const) {
  test(`Reviewer rejects ${name}`, async () => {
    const calls: PlanningGenerateContentArgs[] = [];
    const failure = await capturedFailure(execute(eligibleFacts, providerFor(eligibleFacts, calls, (role, output) => { if (role === "REVIEWER") mutate(output); return output; })), "REVIEWER_CONTRACT_ERROR");
    assert.equal(calls.length, 2);
    assert.equal(failure.public_result.steps[1].error_code, "REVIEWER_CONTRACT_ERROR");
  });
}

for (const verdict of ["NEEDS_INFO", "BLOCKED"] as const) {
  test(`Reviewer ${verdict} restricts an otherwise eligible plan`, async () => {
    const calls: PlanningGenerateContentArgs[] = [];
    const result = await execute(eligibleFacts, providerFor(eligibleFacts, calls, (role, output) => {
      if (role === "REVIEWER") { output.verdict = verdict; output.issues = ["Additional review is needed."]; }
      return output;
    }));
    assert.equal(result.status, verdict);
    assert.equal(result.decision.status, "REVIEWABLE");
    assert.equal(result.execution_authorized, false);
  });
}

test("Reviewer can stop a no-action recommendation but cannot clear deterministic blockers", async () => {
  const stopped = await execute(noActionFacts, providerFor(noActionFacts, [], (role, output) => {
    if (role === "REVIEWER") { output.verdict = "BLOCKED"; output.issues = ["Review found an unresolved concern."]; }
    return output;
  }));
  assert.equal(stopped.status, "BLOCKED");
  assert.equal(stopped.decision.branch, "NO_ACTION_REQUIRED");
  assert.equal(stopped.plan, null);
  const facts = fixtures.cases.find((item) => item.id === "DEV-10")!.facts;
  const blocked = await execute(facts, providerFor(facts, [], (role, output) => {
    if (role === "REVIEWER") { output.verdict = "NEEDS_INFO"; output.issues = ["Clarify the conflicting sources."]; }
    return output;
  }));
  assert.equal(blocked.status, "BLOCKED");
  assert.equal(blocked.plan, null);
});

test("429 and 503 retries are caller-owned, bounded, and every attempt is recorded", async () => {
  const attempts = { PLANNER: 0, REVIEWER: 0 };
  const provider: PlanningGenerateContentFn = async (args) => {
    attempts[args.role]++;
    if (attempts[args.role] === 1) throw Object.assign(new Error("provider unavailable"), { status: args.role === "PLANNER" ? 429 : 503 });
    return { text: JSON.stringify(args.role === "PLANNER" ? proposalFor(eligibleFacts) : reviewFor(eligibleFacts)) };
  };
  const result = await execute(eligibleFacts, provider);
  assert.deepEqual(result.steps.map((step) => [step.role, step.attempt, step.outcome, step.upstream_status]), [
    ["PLANNER", 1, "ERROR", 429], ["PLANNER", 2, "SUCCESS", 200],
    ["REVIEWER", 1, "ERROR", 503], ["REVIEWER", 2, "SUCCESS", 200],
  ]);
});

for (const status of [429, 503, 500, 403]) {
  test(`persistent provider ${status} fails closed with bounded attempts and no raw secret`, async () => {
    let calls = 0;
    const failure = await capturedFailure(execute(eligibleFacts, async () => {
      calls++;
      throw Object.assign(new Error(`Provider leaked ${TEST_KEY}`), { status });
    }), `GEMINI_API_ERROR_${status}`);
    assert.equal(calls, status === 429 || status === 503 ? 2 : 1);
    assert.equal(failure.public_result.steps.length, calls);
    assert.ok(!failure.message.includes(TEST_KEY));
    assert.ok(!JSON.stringify(failure.public_result).includes(TEST_KEY));
    assert.equal(failure.upstream_status, status);
  });
}

test("Reviewer upstream failure clears the validated proposal and keeps both attempted roles", async () => {
  const failure = await capturedFailure(execute(eligibleFacts, async (args) => {
    if (args.role === "PLANNER") return { text: JSON.stringify(proposalFor(eligibleFacts)) };
    throw Object.assign(new Error("unavailable"), { status: 500 });
  }), "GEMINI_API_ERROR_500");
  assert.deepEqual(failure.public_result.steps.map((step) => step.role), ["PLANNER", "REVIEWER"]);
  assert.equal(failure.public_result.planner_rationale, proposalFor(eligibleFacts).rationale);
});

for (const malformed of [undefined, "", "```json\n{}\n```", "{", "x".repeat(16_385)]) {
  test(`invalid JSON response ${malformed === undefined ? "undefined" : malformed.length} cannot become a plan`, async () => {
    let calls = 0;
    await capturedFailure(execute(eligibleFacts, async () => { calls++; return { text: malformed }; }), "PLANNER_POLICY_VETO");
    assert.equal(calls, 1);
  });
}

test("per-call timeout interrupts an ignoring provider and does not retry", async () => {
  let calls = 0;
  const failure = await capturedFailure(execute(eligibleFacts, async () => { calls++; return new Promise(() => {}); }, { callTimeoutMs: 20, totalTimeoutMs: 200 }), "GEMINI_REQUEST_TIMEOUT");
  assert.equal(calls, 1);
  assert.equal(failure.http_status, 504);
  assert.equal(failure.public_result.steps.length, 1);
});

test("overall deadline limits calls below their individual timeout", async () => {
  const failure = await capturedFailure(execute(eligibleFacts, async () => new Promise(() => {}), { callTimeoutMs: 200, totalTimeoutMs: 20 }), "GEMINI_REQUEST_TIMEOUT");
  assert.equal(failure.public_result.steps.length, 1);
});

test("pre-cancellation makes zero calls", async () => {
  const controller = new AbortController(); controller.abort();
  let calls = 0;
  const failure = await capturedFailure(execute(eligibleFacts, async () => { calls++; return { text: "{}" }; }, { signal: controller.signal }), "WORKFLOW_CANCELLED");
  assert.equal(calls, 0);
  assert.equal(failure.public_result.steps.length, 0);
});

test("incoming expired deadline before planning reports timeout and makes zero calls", async () => {
  const controller = new AbortController();
  controller.abort(new DOMException("Service deadline expired", "TimeoutError"));
  let calls = 0;
  const failure = await capturedFailure(execute(eligibleFacts, async () => { calls++; return { text: "{}" }; }, { signal: controller.signal }), "GEMINI_REQUEST_TIMEOUT");
  assert.equal(failure.http_status, 504);
  assert.equal(calls, 0);
  assert.equal(failure.public_result.steps.length, 0);
});

test("incoming deadline interrupts an in-flight Planner as timeout rather than cancellation", async () => {
  const controller = new AbortController();
  let calls = 0;
  const failure = await capturedFailure(execute(eligibleFacts, async () => {
    calls++;
    controller.abort(new DOMException("Service deadline expired", "TimeoutError"));
    return new Promise(() => {});
  }, { signal: controller.signal }), "GEMINI_REQUEST_TIMEOUT");
  assert.equal(failure.http_status, 504);
  assert.equal(calls, 1);
  assert.equal(failure.public_result.steps[0].error_code, "GEMINI_REQUEST_TIMEOUT");
});

test("incoming deadline during retry wait reports timeout and prevents a second provider attempt", async () => {
  const controller = new AbortController();
  let calls = 0;
  const failure = await capturedFailure(execute(eligibleFacts, async () => {
    calls++;
    setTimeout(() => controller.abort(new DOMException("Service deadline expired", "TimeoutError")), 5);
    throw Object.assign(new Error("Rate limited"), { status: 429 });
  }, { signal: controller.signal, retryDelayMs: 200 }), "GEMINI_REQUEST_TIMEOUT");
  assert.equal(failure.http_status, 504);
  assert.equal(calls, 1);
  assert.equal(failure.public_result.steps.length, 1);
  assert.equal(failure.public_result.steps[0].upstream_status, 429);
});

test("incoming cancellation interrupts an in-flight Reviewer and clears proposal", async () => {
  const controller = new AbortController();
  const failure = await capturedFailure(execute(eligibleFacts, async (args) => {
    if (args.role === "PLANNER") return { text: JSON.stringify(proposalFor(eligibleFacts)) };
    controller.abort();
    return new Promise(() => {});
  }, { signal: controller.signal }), "WORKFLOW_CANCELLED");
  assert.equal(failure.http_status, 499);
  assert.deepEqual(failure.public_result.steps.map((step) => step.role), ["PLANNER", "REVIEWER"]);
});

test("key and model validation make zero provider calls", async () => {
  let calls = 0;
  const provider: PlanningGenerateContentFn = async () => { calls++; return { text: "{}" }; };
  await capturedFailure(execute(eligibleFacts, provider, { apiKey: "" }), "GEMINI_KEY_MISSING");
  await capturedFailure(execute(eligibleFacts, provider, { model: "unapproved-model" }), "MODEL_NOT_ALLOWED");
  assert.equal(calls, 0);
});
