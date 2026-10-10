import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { devNull } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  assertCurrentVersionBinding, BINDING_FIELDS, DomainValidationError, validateExpenseFacts, validateReviewRecord,
  validateVersionBinding,
} from "../src/domain/contracts.ts";
import { assertPlanMatchesPolicy, evaluatePolicy, verifyPolicyCitations } from "../src/domain/policy.ts";
import { PROMPT_VERSIONS } from "../server/runtime-config.ts";

// This runner is deliberately opt-in. It never reads a key from an argument or file.
const appDirectory = fileURLToPath(new URL("../", import.meta.url));
const repositoryDirectory = path.dirname(appDirectory);
const docsDirectory = path.join(repositoryDirectory, "docs");
const model = "gemini-3.1-flash-lite";
const caseTimeoutMs = 95_000;
const cancellation = new AbortController();
const knownKey = process.env.GEMINI_API_KEY?.trim() ?? "";
const executeFile = promisify(execFile);
let ownedServer;

function redactText(value) {
  let text = String(value);
  if (knownKey) text = text.split(knownKey).join("[REDACTED_KEY]");
  return text
    .replace(/\bAQ\.[A-Za-z0-9_-]{20,}/g, "[REDACTED_KEY]")
    .replace(/\bAIza[A-Za-z0-9_-]{20,}/g, "[REDACTED_KEY]")
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g, "[REDACTED_KEY]")
    .replace(/\b(?:authorization|proxy-authorization|x-goog-api-key|x-api-key|api[_ -]?key)\s*[:=]\s*(?:Bearer\s+)?["']?[^\s,"';}]+/gi, "[REDACTED_CREDENTIAL_HEADER]");
}

export function redact(value) {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([name, item]) => [redactText(name), redact(item)]));
  }
  return value;
}

function integerOrNull(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function statusOrNull(value) {
  return Number.isInteger(value) && value >= 100 && value <= 599 ? value : null;
}

function safeCode(value) {
  return typeof value === "string" && /^[A-Z0-9_:-]{1,100}$/i.test(value) ? redactText(value) : null;
}

function safeSteps(value) {
  if (!Array.isArray(value)) return [];
  // Retain every reported attempt, including malformed telemetry, without provider bodies.
  return value.map((step) => ({
    role: ["FACTS", "PLANNER", "REVIEWER"].includes(step?.role) ? step.role : "UNKNOWN",
    attempt: integerOrNull(step?.attempt),
    outcome: ["SUCCESS", "ERROR"].includes(step?.outcome) ? step.outcome : "UNKNOWN",
    duration_ms: integerOrNull(step?.duration_ms),
    requested_model_id: typeof step?.requested_model_id === "string" ? redactText(step.requested_model_id) : null,
    model_id: typeof step?.model_id === "string" ? redactText(step.model_id) : null,
    upstream_status: statusOrNull(step?.upstream_status),
    token_usage: step?.token_usage && typeof step.token_usage === "object" ? {
      prompt_tokens: integerOrNull(step.token_usage.prompt_tokens),
      candidate_tokens: integerOrNull(step.token_usage.candidate_tokens),
      thoughts_tokens: integerOrNull(step.token_usage.thoughts_tokens),
      total_tokens: integerOrNull(step.token_usage.total_tokens),
    } : null,
    error_code: safeCode(step?.error_code),
  }));
}

export function selectFixtureIds(cases, includeThreshold = false) {
  const permitted = ["DEV-01", "DEV-04", "DEV-10", "DEV-03"];
  if (cases === undefined) return includeThreshold ? permitted : permitted.slice(0, 3);
  assert(!includeThreshold, "Use either --cases or --include-threshold, not both.");
  assert(typeof cases === "string", "--cases requires a comma-separated development fixture list.");
  const selected = cases.split(",").map((id) => id.trim());
  assert(selected.length >= 1 && selected.length <= 4 && new Set(selected).size === selected.length
    && selected.every((id) => permitted.includes(id)), "--cases accepts one to four unique DEV-01, DEV-04, DEV-10 or DEV-03 IDs only.");
  return selected;
}

function parseArguments() {
  const args = process.argv.slice(2);
  let live = false;
  let includeThreshold = false;
  let output;
  let cases;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--live") live = true;
    else if (arg === "--include-threshold") includeThreshold = true;
    else if (arg === "--cases") {
      assert(cases === undefined && args[index + 1] && !args[index + 1].startsWith("--"), "--cases requires one comma-separated list.");
      cases = args[++index];
    } else if (arg === "--output") {
      assert(!output && args[index + 1] && !args[index + 1].startsWith("--"), "--output requires one JSON path under repository docs.");
      output = args[++index];
    } else throw new Error("Unsupported argument. Use --live [--include-threshold | --cases DEV-01,DEV-10] [--output docs/acceptance/NAME.json].");
  }
  assert(live, "No live call was made. Explicit --live is required; GEMINI_API_KEY must be supplied in the process environment.");
  assert(knownKey && knownKey !== "MY_GEMINI_API_KEY", "No live call was made. GEMINI_API_KEY is missing from the process environment.");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.resolve(repositoryDirectory, output ?? `docs/acceptance/S02-live-validation-${stamp}.json`);
  const relative = path.relative(docsDirectory, outputPath);
  assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative) && path.extname(outputPath).toLowerCase() === ".json",
    "The output must be a JSON file inside repository docs.");
  return { selectedIds: selectFixtureIds(cases, includeThreshold), outputPath };
}

async function prepareOutput(outputPath) {
  const canonicalDocs = await realpath(docsDirectory);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const canonicalParent = await realpath(path.dirname(outputPath));
  const relative = path.relative(canonicalDocs, canonicalParent);
  assert(!relative.startsWith("..") && !path.isAbsolute(relative), "The output directory must remain inside repository docs.");
  const canonicalOutput = path.join(canonicalParent, path.basename(outputPath));
  try {
    await lstat(canonicalOutput);
    throw new Error("The output already exists. Choose a new JSON report path before making live calls.");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return canonicalOutput;
}

async function startOwnedServer() {
  // Prevent dotenv from silently reading a local key file before createApp is imported.
  process.env.DOTENV_CONFIG_PATH = devNull;
  process.env.DOTENV_CONFIG_QUIET = "true";
  const { createApp } = await import("../server.ts");
  const app = createApp({ apiKeyOverride: knownKey });
  await new Promise((resolve, reject) => {
    ownedServer = app.listen(0, "127.0.0.1", resolve);
    ownedServer.once("error", reject);
  });
  const address = ownedServer.address();
  assert(address && typeof address === "object" && address.address === "127.0.0.1", "The acceptance server must bind only to loopback.");
  return `http://127.0.0.1:${address.port}`;
}

async function stopOwnedServer() {
  if (!ownedServer) return;
  ownedServer.closeAllConnections();
  await new Promise((resolve, reject) => ownedServer.close((error) => error ? reject(error) : resolve()));
  ownedServer = undefined;
}

async function sourceSnapshot() {
  const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
    ["path", "systemroot", "windir", "temp", "tmp"].includes(name.toLowerCase())));
  const options = { cwd: repositoryDirectory, env: environment, timeout: 5_000, maxBuffer: 65_536, windowsHide: true };
  try {
    const { stdout: revision } = await executeFile("git", ["rev-parse", "HEAD"], options);
    const { stdout: status } = await executeFile("git", ["status", "--porcelain", "--untracked-files=normal"], options);
    return {
      base_commit: /^[a-f0-9]{40}$/.test(revision.trim()) ? revision.trim() : null,
      working_tree_dirty: status.trim().length > 0,
      note: "The acceptance ran against this working tree. The later S2 delivery commit must explicitly bind this report to the reviewed source; this base commit alone does not identify uncommitted changes.",
    };
  } catch {
    return { base_commit: null, working_tree_dirty: null, note: "Git source metadata was unavailable; no clean or committed source claim is made." };
  }
}

/** @param {{facts: string, planner: string, reviewer: string}} [expectedPromptVersions] */
export function verifySuccess(body, fixture, expectedPromptVersions = PROMPT_VERSIONS) {
  assert.equal(body.ok, true, "The live workflow response must succeed.");
  const facts = validateExpenseFacts(body.facts);
  assert.equal(facts.amount_minor, fixture.facts.amount_minor, "The extracted amount must match the synthetic development case.");
  assert.equal(facts.currency, "USD");
  assert.equal(facts.employee_identifier, fixture.facts.employee_identifier, "The extracted employee must match the synthetic development case.");
  assert.equal(facts.receipt_status, fixture.facts.receipt_status, "The extracted receipt status must match the synthetic development case.");
  assert.equal(facts.contradictions.length > 0, fixture.expected.branch === "BLOCKED", "Source contradictions must be preserved and never invented.");
  const workflow = body.workflow;
  assert(workflow && typeof workflow === "object", "The live response must contain a workflow result.");
  assert.equal(workflow.stage, "S2");
  assert.deepEqual(body.prompt_versions, expectedPromptVersions);
  assert.deepEqual(workflow.prompt_versions, expectedPromptVersions);
  assert.deepEqual(body.steps, workflow.steps, "Top-level telemetry must include the same full workflow attempts.");
  assert.equal(workflow.execution_authorized, false);
  assert.equal(workflow.decision?.execution_authorized, false);
  assert.deepEqual(workflow.decision, evaluatePolicy(facts), "The server decision must match deterministic policy evaluation.");
  assert.equal(workflow.decision.branch, fixture.expected.branch);
  assert.equal(workflow.status, fixture.expected.status);
  const requiredCitations = fixture.expected.citation_ids;
  verifyPolicyCitations(workflow.decision.citations, requiredCitations);
  const binding = validateVersionBinding(workflow.binding);
  assert.equal(binding.run_id, body.run_id, "All stage records must bind to the current run.");
  assert.equal(typeof workflow.planner_rationale, "string");
  assert(workflow.planner_rationale.trim().length > 0, "The real planner must provide a rationale.");
  if (fixture.expected.case_eligible) {
    const plan = assertPlanMatchesPolicy(workflow.plan, facts);
    assertCurrentVersionBinding(binding, Object.fromEntries(BINDING_FIELDS.map((field) => [field, plan[field]])));
  } else assert.equal(workflow.plan, null, "A noneligible decision must not produce an executable case plan.");
  const review = validateReviewRecord(workflow.review);
  assertCurrentVersionBinding(binding, Object.fromEntries(BINDING_FIELDS.map((field) => [field, review[field]])));
  assert.equal(review.verdict, "PASS", "The independent review must pass for the expected recommendation, including safe noneligible results.");
  verifyPolicyCitations(review.citations, requiredCitations);
  assert(Array.isArray(workflow.steps) && workflow.steps.length >= 3 && workflow.steps.length <= 6,
    "The workflow must report its bounded real model attempts.");
  for (const role of ["FACTS", "PLANNER", "REVIEWER"]) {
    const attempts = workflow.steps.filter((step) => step.role === role);
    assert(attempts.length >= 1 && attempts.length <= 2, `The ${role} stage must report one to two attempts.`);
    assert.equal(attempts.at(-1).outcome, "SUCCESS", `The ${role} stage must finish with a real successful provider call.`);
    attempts.forEach((step, index) => {
      assert.equal(step.attempt, index + 1, `The ${role} attempt numbers must retain all attempts in order.`);
      assert.equal(step.requested_model_id, model);
      assert.equal(typeof step.model_id, "string");
      assert(step.model_id.length > 0);
      assert(Number.isFinite(step.duration_ms) && step.duration_ms >= 0);
      assert(["SUCCESS", "ERROR"].includes(step.outcome));
      if (step.outcome === "SUCCESS") assert.equal(step.upstream_status, 200);
    });
  }
  assert(!Object.hasOwn(body, "case_record") && !Object.hasOwn(workflow, "case_record"), "S2 must not create a case.");
  assert(!["APPROVED", "SUBMITTED"].includes(workflow.status), "S2 must never imply human approval or a durable write.");
}

function publicResult(body) {
  const workflow = body?.workflow;
  return redact({
    ok: body?.ok === true,
    run_id: typeof body?.run_id === "string" ? body.run_id : null,
    timestamp: typeof body?.timestamp === "string" ? body.timestamp : null,
    requested_model_id: typeof body?.requested_model_id === "string" ? body.requested_model_id : null,
    model_id: typeof body?.model_id === "string" ? body.model_id : null,
    http_status: statusOrNull(body?.http_status),
    upstream_status: statusOrNull(body?.upstream_status),
    error_code: safeCode(body?.error?.code),
    prompt_versions: body?.prompt_versions ? {
      facts: body.prompt_versions.facts, planner: body.prompt_versions.planner,
      reviewer: body.prompt_versions.reviewer,
    } : null,
    facts: body?.facts ?? null,
    workflow: workflow && typeof workflow === "object" ? {
      stage: workflow.stage, status: workflow.status, decision: workflow.decision,
      plan: workflow.plan, review: workflow.review, planner_rationale: workflow.planner_rationale,
      execution_authorized: workflow.execution_authorized, binding: workflow.binding,
      steps: safeSteps(workflow.steps),
      prompt_versions: workflow.prompt_versions ? {
        facts: workflow.prompt_versions.facts, planner: workflow.prompt_versions.planner,
        reviewer: workflow.prompt_versions.reviewer,
      } : null,
    } : null,
    // An extraction failure may supply top-level attempts before a workflow exists.
    steps: safeSteps(body?.steps),
  });
}

export function providerStopReason(body, transportStatus) {
  const statuses = [transportStatus, body?.upstream_status,
    ...(Array.isArray(body?.workflow?.steps) ? body.workflow.steps.map((step) => step?.upstream_status) : []),
    ...(Array.isArray(body?.steps) ? body.steps.map((step) => step?.upstream_status) : [])];
  if (statuses.includes(402)) return "The upstream returned HTTP 402. Resolve the payment or access prerequisite before another live call; the exact account cause is unverified.";
  if (statuses.some((status) => [401, 403].includes(status))) return "Provider authentication or permission failed. Resolve the prerequisite before another live call.";
  // Inspect only to classify a stop, never retain or print the provider message.
  const message = typeof body?.error?.message === "string" ? body.error.message : "";
  const explicitKeyOrBilling = /\b(?:billing|payment|credits?|balance)\b|\b(?:api[_ -]?key|credential).{0,60}\b(?:invalid|expired|revoked|not\s+valid|missing|required)\b|\b(?:invalid|expired|revoked).{0,40}\b(?:api[_ -]?key|credential)\b/i.test(message);
  return statuses.includes(400) && explicitKeyOrBilling
    ? "The provider explicitly reported a key or billing prerequisite. Resolve it before another live call." : null;
}

async function runCase(baseUrl, fixture) {
  const started = Date.now();
  const record = {
    fixture_id: fixture.id, expected_branch: fixture.expected.branch,
    started_at: new Date().toISOString(), outcome: "FAIL", transport_status: null,
    duration_ms: null, result: null, failure: null,
  };
  try {
    const url = new URL("/api/workflow", baseUrl);
    assert.equal(url.origin, baseUrl);
    const response = await fetch(url, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...fixture.input, model_id: model }), redirect: "error",
      signal: AbortSignal.any([cancellation.signal, AbortSignal.timeout(caseTimeoutMs)]),
    });
    record.transport_status = response.status;
    assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i, "The API must return JSON.");
    const body = await response.json();
    // Keep sanitized stage telemetry before assertions, so failed acceptance is reproducible.
    record.result = publicResult(body);
    record.stop_live_suite_reason = providerStopReason(body, response.status);
    assert.equal(response.status, 200, "The live API did not return a successful HTTP status; see sanitized error_code and attempts.");
    verifySuccess(body, fixture);
    record.outcome = "PASS";
  } catch (error) {
    // Never serialize provider errors or their causes/stacks/raw response bodies.
    record.failure = redactText(error instanceof assert.AssertionError ? error.message
      : error instanceof DomainValidationError ? `Acceptance contract check failed: ${error.code} (${error.field}).`
      : "The local acceptance request failed or timed out; inspect sanitized telemetry, configuration and connectivity.");
  }
  record.duration_ms = Date.now() - started;
  record.finished_at = new Date().toISOString();
  return redact(record);
}

function tokenSummary(records) {
  const steps = records.flatMap((record) => record.result?.workflow?.steps?.length
    ? record.result.workflow.steps : record.result?.steps ?? []);
  const known = steps.filter((step) => step.token_usage?.total_tokens !== null && step.token_usage?.total_tokens !== undefined);
  return {
    reported_attempt_count: steps.length,
    requests_without_attempt_telemetry: records.filter((record) => record.result === null).length,
    provider_attempt_count_fully_reported: records.length > 0 && records.every((record) => record.result !== null),
    known_total_tokens: known.reduce((sum, step) => sum + step.token_usage.total_tokens, 0),
    unreported_token_attempt_count: steps.length - known.length,
    complete_token_accounting: steps.length > 0 && known.length === steps.length,
    measured_cost_usd: null,
    cost_note: "Provider pricing and billed cost were not measured. Failed or unreported attempts are not counted as zero tokens or zero cost.",
  };
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => cancellation.abort(new Error("The live acceptance was interrupted.")));
}

async function main() {
  const { selectedIds, outputPath } = parseArguments();
  const canonicalOutput = await prepareOutput(outputPath);
  const fixtureDocument = JSON.parse(await readFile(path.join(appDirectory, "fixtures", "development-cases.json"), "utf8"));
  const fixtures = selectedIds.map((id) => {
    const fixture = fixtureDocument.cases.find((candidate) => candidate.id === id);
    assert(fixture, "The required public development fixture is unavailable.");
    return fixture;
  });
  const report = {
    schema_version: "1.0.0", stage: "S2", mode: "live-gemini-local-loopback",
    created_at: new Date().toISOString(), requested_model_id: model,
    fixture_version: fixtureDocument.fixture_version, policy_version: fixtureDocument.policy_version,
    purpose: "Opt-in live development acceptance. This is not held-out evaluation, cloud deployment, approval or execution evidence.",
    runtime: { node: process.version, request_timeout_ms: caseTimeoutMs },
    source: await sourceSnapshot(),
    bounds: { maximum_selected_cases: 4, maximum_attempts_per_stage: 2, maximum_stage_attempts_per_case: 6, runner_request_retries: 0 },
    selected_fixture_ids: selectedIds, records: [], ok: false, interrupted: false,
  };
  try {
    const baseUrl = await startOwnedServer();
    for (const fixture of fixtures) {
      if (cancellation.signal.aborted) { report.interrupted = true; break; }
      const record = await runCase(baseUrl, fixture);
      report.records.push(record);
      console.log(redactText(`${fixture.id}: ${record.outcome} (${record.duration_ms} ms)`));
      if (record.stop_live_suite_reason) {
        report.stop_reason = record.stop_live_suite_reason;
        break;
      }
    }
    report.ok = report.records.length === fixtures.length && report.records.every((record) => record.outcome === "PASS");
  } catch {
    report.stop_reason = "Could not start or complete the local live acceptance server. No raw errors were retained.";
  } finally {
    try { await stopOwnedServer(); }
    catch { report.ok = false; report.stop_reason = "The runner could not confirm its owned local server closed."; }
    report.finished_at = new Date().toISOString();
    report.unattempted_fixture_ids = selectedIds.filter((id) => !report.records.some((record) => record.fixture_id === id));
    report.token_accounting = tokenSummary(report.records);
    const safeReport = redact(report);
    await writeFile(canonicalOutput, `${JSON.stringify(safeReport, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    console.log(redactText(`Sanitized acceptance report: ${canonicalOutput}`));
  }
  if (!report.ok) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(redactText(error instanceof Error ? error.message : "The acceptance runner could not complete."));
    process.exitCode = 1;
  });
}
