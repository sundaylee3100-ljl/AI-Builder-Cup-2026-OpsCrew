import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { verifySuccess, providerStopReason, redact, selectFixtureIds } from "../scripts/check-workflow-live.mjs";
import { runPlanningReview } from "../server/planning-service.ts";
import { PROMPT_VERSIONS } from "../server/runtime-config.ts";

const fixtures = JSON.parse(readFileSync(new URL("../fixtures/development-cases.json", import.meta.url), "utf8")).cases;
const model = "gemini-3.1-flash-lite";

async function offlineEnvelope(fixture: typeof fixtures[number]) {
  const workflow = await runPlanningReview({
    facts: fixture.facts, runId: "run_offline_runner_regression", model,
    apiKey: "offline-provider-only", signal: new AbortController().signal,
    generateContentFn: async (args) => {
      const { deterministic_decision: decision, validated_facts: facts } = JSON.parse(args.promptPayload);
      const common = { citation_ids: decision.citations.map((item: { clause_id: string }) => item.clause_id) };
      const output = args.role === "REVIEWER" ? { ...common, verdict: "PASS", issues: [] } : {
        ...common, branch: decision.branch, action: decision.allowed_action,
        proposed_case: decision.case_eligible ? {
          case_type: decision.branch, employee_identifier: facts.employee_identifier,
          amount_minor: facts.amount_minor, currency: facts.currency, receipt_status: facts.receipt_status,
          description: facts.description, evidence_requirements: decision.evidence_requirements,
        } : null,
        rationale: "Offline runner regression; no live model call or execution.",
      };
      return { text: JSON.stringify(output), modelVersion: "offline-runner-fixture" };
    },
  });
  workflow.steps.unshift({ role: "FACTS", attempt: 1, outcome: "SUCCESS", duration_ms: 0,
    requested_model_id: model, model_id: "offline-runner-fixture", upstream_status: 200,
    token_usage: null, error_code: null });
  return { ok: true, run_id: workflow.binding.run_id, facts: fixture.facts,
    workflow, steps: workflow.steps, prompt_versions: PROMPT_VERSIONS };
}

test("Live acceptance verifier accepts complete records for all twelve offline development branches", async () => {
  for (const fixture of fixtures) verifySuccess(await offlineEnvelope(fixture), fixture);
});

test("Live verifier projects bindings without relaxing stale plan or reviewer checks", async () => {
  const fixture = fixtures.find((item: typeof fixtures[number]) => item.id === "DEV-04");
  for (const role of ["plan", "review"] as const) {
    const envelope = await offlineEnvelope(fixture);
    envelope.workflow[role]!.owner_id = "different-owner";
    assert.throws(() => verifySuccess(envelope, fixture), /stale|another run or owner/);
  }
});

test("Offline replay validates three genuine captured successes while retaining the failed conflict record", () => {
  const report = JSON.parse(readFileSync(new URL("../../docs/acceptance/S02-live-validation-2026-10-10.json", import.meta.url), "utf8"));
  const historicalVersions = { facts: "opscrew-facts-1.1.0", planner: "opscrew-planner-1.0.0", reviewer: "opscrew-reviewer-1.0.0" };
  for (const record of report.records) {
    const fixture = fixtures.find((item: typeof fixtures[number]) => item.id === record.fixture_id);
    if (record.fixture_id === "DEV-10") assert.throws(() => verifySuccess(record.result, fixture, historicalVersions));
    else verifySuccess(record.result, fixture, historicalVersions);
    assert.equal(record.outcome, "FAIL", "Historical runner outcomes must remain unchanged.");
  }
});

test("Opt-in runner stops account errors and redacts credentials without live requests", () => {
  for (const status of [401, 402, 403]) assert(providerStopReason({ upstream_status: status }, 500));
  assert(providerStopReason({ error: { message: "API key is invalid" } }, 400));
  assert.equal(providerStopReason({ error: { message: "amount invalid" } }, 400), null);
  assert.equal(providerStopReason({ upstream_status: 503 }, 500), null);
  const credential = "AQ." + "k".repeat(42);
  assert.deepEqual(redact({ secret: credential }), { secret: "[REDACTED_KEY]" });
  assert(!String(redact("Authorization: Bearer synthetic-secret-value")).includes("synthetic-secret-value"));
});

test("Targeted live revalidation cannot duplicate fixtures, expand into held-out cases or exceed the fixed suite", () => {
  assert.deepEqual(selectFixtureIds("DEV-01,DEV-10"), ["DEV-01", "DEV-10"]);
  assert.deepEqual(selectFixtureIds(undefined, true), ["DEV-01", "DEV-04", "DEV-10", "DEV-03"]);
  for (const input of ["", "DEV-01,DEV-01", "EVAL-01", "DEV-02", "DEV-01,DEV-04,DEV-10,DEV-03,DEV-01"])
    assert.throws(() => selectFixtureIds(input));
  assert.throws(() => selectFixtureIds("DEV-01", true));
});

test("A correctly blocked conflict review passes semantic acceptance while unsafe status and unresolved PASS fail", async () => {
  const fixture = fixtures.find((item: typeof fixtures[number]) => item.id === "DEV-10");
  const envelope = await offlineEnvelope(fixture);
  envelope.workflow.review!.verdict = "BLOCKED";
  envelope.workflow.review!.issues = ["Unresolved contradictory source amounts block a case under SYN-003."];
  verifySuccess(envelope, fixture);
  const unsafe = structuredClone(envelope);
  unsafe.workflow.status = "REVIEWABLE";
  assert.throws(() => verifySuccess(unsafe, fixture));
  envelope.workflow.review!.verdict = "PASS";
  assert.throws(() => verifySuccess(envelope, fixture), /unresolved issues/);
});
