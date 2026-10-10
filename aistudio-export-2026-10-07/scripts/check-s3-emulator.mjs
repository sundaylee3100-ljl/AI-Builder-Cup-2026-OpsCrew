import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, realpath, stat } from "node:fs/promises";
import { dirname, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { createApp } from "../server.ts";
import { CaseService, FirestoreCaseStore } from "../server/case-service.ts";
import { POLICY_VERSION } from "../src/domain/contracts.ts";
import { PROMPT_VERSIONS } from "../server/runtime-config.ts";

const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const acceptanceDirectory = resolve(appDirectory, "../docs/acceptance");
const DEMO_PROJECT = "demo-opscrew-s3";
const checks = [];
let modelCalls = 0;

function emulatorHost(name) {
  const value = process.env[name];
  assert(typeof value === "string" && /^(?:127\.0\.0\.1|localhost):\d{2,5}$/.test(value),
    `${name} must be an explicit loopback host:port without a protocol.`);
  const port = Number(value.slice(value.lastIndexOf(":") + 1));
  assert(port > 0 && port <= 65535, `${name} must name a valid port.`);
  return value;
}

function safeMessage(error) {
  return String(error?.message ?? error)
    .replace(/(?:AIza[0-9A-Za-z_-]{30,}|AQ\.[0-9A-Za-z_-]{30,}|eyJ[0-9A-Za-z_-]+\.[0-9A-Za-z_-]+\.[0-9A-Za-z_-]*)/g, "[REDACTED_CREDENTIAL]")
    .slice(0, 1200);
}

async function check(name, run) {
  const started = performance.now();
  try {
    const evidence = await run();
    checks.push({ name, outcome: "PASS", duration_ms: Math.round(performance.now() - started), evidence: evidence ?? null });
    console.log(`PASS ${name}`);
  } catch (error) {
    checks.push({ name, outcome: "FAIL", duration_ms: Math.round(performance.now() - started), error: safeMessage(error) });
    console.error(`FAIL ${name}: ${safeMessage(error)}`);
  }
}

async function outputPath() {
  const args = process.argv.slice(2);
  if (args.length === 0) return null;
  assert(args.length === 2 && args[0] === "--output", "Usage: node scripts/check-s3-emulator.mjs [--output ../docs/acceptance/S03-emulator-validation-<checkpoint>.json]");
  const path = resolve(process.cwd(), args[1]);
  const directory = await realpath(acceptanceDirectory);
  const parent = await realpath(dirname(path));
  assert.equal(parent, directory, "Evidence must be an immediate JSON child of docs/acceptance.");
  const rel = relative(directory, path);
  assert(!isAbsolute(rel) && !rel.startsWith("..") && /^S03-emulator-validation-[\w-]+\.json$/.test(rel), "Choose a new S03 emulator evidence filename.");
  try { await stat(path); assert.fail("Refusing to overwrite existing acceptance evidence."); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  return path;
}

async function request(base, method, path, token, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000),
  });
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  return { status: response.status, body: await response.json() };
}

async function localIdentity(authHost) {
  const response = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-only-placeholder`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ returnSecureToken: true }), signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();
  assert.equal(response.status, 200, "Auth emulator anonymous signup must succeed.");
  assert.equal(typeof result.idToken, "string");
  assert.equal(typeof result.localId, "string");
  return { token: result.idToken, uid: result.localId };
}

function alteredToken(token, overrides) {
  const parts = token.split(".");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  return `${parts[0]}.${Buffer.from(JSON.stringify({ ...payload, ...overrides })).toString("base64url")}.${parts[2]}`;
}

async function sourceSnapshot() {
  const sources = ["package.json", "package-lock.json", "server.ts", "server/case-service.ts", "server/case-routes.ts", "server/firebase-runtime.ts", "server/runtime-config.ts", "scripts/check-s3-emulator.mjs", "fixtures/development-cases.json", "firebase.json", "firestore.rules", "firestore.indexes.json"];
  const hashes = Object.fromEntries(await Promise.all(sources.map(async (file) => [file, createHash("sha256").update(await readFile(resolve(appDirectory, file))).digest("hex")])));
  let revision = null;
  let dirty = null;
  try {
    revision = execFileSync("git", ["-C", appDirectory, "rev-parse", "HEAD"], { encoding: "utf8", timeout: 3000, stdio: ["ignore", "pipe", "ignore"] }).trim();
    dirty = Boolean(execFileSync("git", ["-C", appDirectory, "status", "--porcelain"], { encoding: "utf8", timeout: 3000, stdio: ["ignore", "pipe", "ignore"] }).trim());
  } catch { /* Source file hashes remain available when Git is absent. */ }
  return { git_revision: revision, working_tree_dirty: dirty, sha256: hashes };
}

function syntheticProposal(args) {
  modelCalls++;
  const payload = JSON.parse(args.promptPayload);
  const decision = payload.deterministic_decision;
  const facts = payload.validated_facts;
  return {
    text: JSON.stringify(args.role === "REVIEWER" ? {
      verdict: "PASS", issues: [], citation_ids: decision.citations.map((citation) => citation.clause_id),
    } : {
      branch: decision.branch, action: decision.allowed_action,
      proposed_case: decision.case_eligible ? {
        case_type: decision.branch, employee_identifier: facts.employee_identifier,
        amount_minor: facts.amount_minor, currency: facts.currency, receipt_status: facts.receipt_status,
        description: facts.description, evidence_requirements: decision.evidence_requirements,
      } : null,
      citation_ids: decision.citations.map((citation) => citation.clause_id),
      rationale: "Injected public DEV-04 fixture for local emulator acceptance; no real model call.",
    }),
    modelVersion: "offline-public-fixture",
  };
}

async function closeServer(server) {
  if (!server) return;
  server.closeAllConnections?.();
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
}

// The runner is intentionally separate from npm test: genuine Firebase emulators
// are a prerequisite and their absence must fail, not silently skip assertions.
async function main() {
  const reportPath = await outputPath();
  const project = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? process.env.FIREBASE_PROJECT_ID ?? DEMO_PROJECT;
  assert.equal(project, DEMO_PROJECT, "The S3 runner only accepts the local demo-opscrew-s3 project.");
  const authHost = emulatorHost("FIREBASE_AUTH_EMULATOR_HOST");
  const firestoreHost = emulatorHost("FIRESTORE_EMULATOR_HOST");
  process.env.FIREBASE_PROJECT_ID = DEMO_PROJECT;
  process.env.OPSCREW_FIREBASE_MODE = "emulator";
  const startedAt = new Date().toISOString();
  const sources = await sourceSnapshot();
  const adminApp = initializeApp({ projectId: DEMO_PROJECT }, `s3-validation-${randomUUID()}`);
  const auth = getAuth(adminApp);
  const db = getFirestore(adminApp);
  const namespace = `opscrew_s3_test_${randomUUID().replaceAll("-", "")}`;
  const store = new FirestoreCaseStore(db, namespace);
  const clock = { now: Date.now() };
  let abortTransaction = false;
  let retryTransaction = false;
  let retryCallbacks = 0;
  let failReadback = false;
  const transaction = store.runTransaction.bind(store);
  const getRecord = store.get.bind(store);
  store.runTransaction = (operation) => transaction(async (context) => {
    const result = await operation(context);
    if (abortTransaction) {
      abortTransaction = false;
      throw new Error("Injected transaction abort after buffered writes, before commit.");
    }
    if (retryTransaction) {
      retryCallbacks++;
      if (retryCallbacks === 1) throw Object.assign(new Error("Injected retriable Firestore ABORTED before commit."), { code: 10 });
      retryTransaction = false;
    }
    return result;
  });
  store.get = async (kind, id) => {
    if (failReadback && kind === "cases") {
      failReadback = false;
      throw new Error("Injected independent readback outage.");
    }
    return getRecord(kind, id);
  };
  const fixtures = JSON.parse(await readFile(resolve(appDirectory, "fixtures/development-cases.json"), "utf8"));
  let selectedFixture = fixtures.cases.find((item) => item.id === "DEV-04");
  const service = new CaseService({ store, now: () => clock.now });
  const runtime = {
    config: {
      enabled: true, mode: "emulator",
      firebase: { apiKey: "emulator-only-placeholder", authDomain: `${DEMO_PROJECT}.firebaseapp.com`, projectId: DEMO_PROJECT, appId: "emulator-only-placeholder" },
      auth_emulator_url: `http://${authHost}`,
    },
    caseService: service,
    verifyIdToken: async (token) => ({ uid: (await auth.verifyIdToken(token)).uid }),
  };
  let server;
  let base;
  async function startServer() {
    const app = createApp({
      caseRuntime: runtime,
      apiKeyOverride: "offline-provider-never-used-on-network",
      generateContentFn: async () => { modelCalls++; return { text: JSON.stringify(selectedFixture.facts), modelVersion: "offline-public-fixture" }; },
      planningGenerateContentFn: async (args) => syntheticProposal(args),
      planningRetryDelayMs: 0,
    });
    server = await new Promise((resolveServer) => { const owned = app.listen(0, "127.0.0.1", () => resolveServer(owned)); });
    const address = server.address();
    assert(address && typeof address === "object");
    base = `http://127.0.0.1:${address.port}`;
  }
  async function counts() {
    const kinds = ["cases", "approvals", "audit", "idempotency"];
    const sizes = await Promise.all(kinds.map(async (kind) => (await db.collection(`${namespace}_${kind}`).get()).size));
    return Object.fromEntries(kinds.map((kind, index) => [kind, sizes[index]]));
  }
  async function noBusinessWrites(operation) {
    const before = await counts();
    await operation();
    const after = await counts();
    assert.deepEqual(after, before, "Denied execution must not add cases, approvals, success results or audits.");
    return { before, after };
  }
  async function plan(owner, fixtureId = "DEV-04") {
    selectedFixture = fixtures.cases.find((item) => item.id === fixtureId);
    const response = await request(base, "POST", "/api/workflow", owner.token, { ...selectedFixture.input, input_version: 1, model_id: "gemini-3.1-flash-lite" });
    assert.equal(response.status, 200); assert.equal(response.body.ok, true);
    assert.equal(response.body.workflow.binding.owner_id, owner.uid);
    return response.body;
  }
  async function prepare(owner, workflow) {
    const response = await request(base, "POST", `/api/runs/${workflow.run_id}/confirmation`, owner.token, { binding: workflow.workflow.binding });
    assert.equal(response.status, 200); assert.equal(response.body.ok, true);
    return response.body.confirmation;
  }
  function command(intent, key = `key_${randomUUID()}`) {
    return { approval_id: intent.approval_id, binding: intent.binding, idempotency_key: key, confirmed: true };
  }
  try {
    const alice = await localIdentity(authHost);
    const bob = await localIdentity(authHost);
    await check("Auth emulator produces distinct trusted UIDs", async () => {
      const verifiedAlice = await auth.verifyIdToken(alice.token);
      const verifiedBob = await auth.verifyIdToken(bob.token);
      assert.equal(verifiedAlice.uid, alice.uid); assert.equal(verifiedBob.uid, bob.uid);
      assert.notEqual(alice.uid, bob.uid);
      return { owners: 2, tokens_recorded: false };
    });
    await check("Admin token verification rejects expired and wrong-project credentials", async () => {
      await assert.rejects(auth.verifyIdToken(alteredToken(alice.token, { exp: 1 })));
      await assert.rejects(auth.verifyIdToken(alteredToken(alice.token, { aud: "demo-another-project" })));
      await assert.rejects(auth.verifyIdToken("invalid-token"));
    });
    await startServer();
    let firstPlan;
    let firstIntent;
    let firstCommand;
    let firstCaseId;
    await check("Authenticated workflow persists a current owned plan without a case", async () => {
      firstPlan = await plan(alice);
      assert.equal(firstPlan.workflow.status, "REVIEWABLE");
      assert.equal(firstPlan.workflow.review.verdict, "PASS");
      const owned = await request(base, "GET", `/api/runs/${firstPlan.run_id}`, alice.token);
      assert.equal(owned.status, 200); assert.equal(owned.body.run.status, "REVIEWABLE");
      assert.equal(owned.body.run.workflow_response.workflow.plan.owner_id, alice.uid);
      assert.equal((await counts()).cases, 0);
      firstIntent = await prepare(alice, firstPlan);
      assert.match(firstIntent.input_digest, /^[a-f0-9]{64}$/);
      assert.match(firstIntent.plan_digest, /^[a-f0-9]{64}$/);
      assert(Date.parse(firstIntent.expires_at) > Date.parse(firstIntent.prepared_at));
      firstCommand = command(firstIntent, "owner-scoped-shared-key");
      return { run_id: firstPlan.run_id, plan_id: firstPlan.workflow.binding.plan_id, confirmation_expires_at: firstIntent.expires_at, case_count: 0 };
    });
    await check("Missing, invalid, expired and wrong-project tokens create zero business writes", async () => noBusinessWrites(async () => {
      const beforeCalls = modelCalls;
      for (const token of [undefined, "invalid-token", alteredToken(alice.token, { exp: 1 }), alteredToken(alice.token, { aud: "demo-another-project" })]) {
        const read = await request(base, "GET", "/api/runs", token);
        assert.equal(read.status, 401);
        const write = await request(base, "POST", "/api/cases", token, firstCommand);
        assert.equal(write.status, 401); assert(!write.body.case_id);
        for (const path of ["/api/workflow", "/api/analyze"]) {
          const analysis = await request(base, "POST", path, token, { ...selectedFixture.input, input_version: 1 });
          assert.equal(analysis.status, 401);
        }
      }
      assert.equal(modelCalls, beforeCalls, "Unauthorized analysis must not consume model calls.");
    }));
    await check("Cross-owner run read, confirmation, rejection, invalidation and creation are denied", async () => noBusinessWrites(async () => {
      const read = await request(base, "GET", `/api/runs/${firstPlan.run_id}`, bob.token);
      assert.equal(read.status, 404); assert(!read.body.run);
      for (const action of ["confirmation", "reject", "invalidate"]) {
        const result = await request(base, "POST", `/api/runs/${firstPlan.run_id}/${action}`, bob.token, { binding: firstPlan.workflow.binding });
        assert.equal(result.status, 404); assert(!result.body.run); assert(!result.body.confirmation);
      }
      const result = await request(base, "POST", "/api/cases", bob.token, firstCommand);
      assert.equal(result.status, 404); assert(!result.body.case_id);
    }));
    await check("Missing confirmation, forged approved/owner/action and altered bindings are vetoed", async () => noBusinessWrites(async () => {
      for (const body of [
        { ...firstCommand, confirmed: false },
        { ...firstCommand, approved: true },
        { ...firstCommand, owner_id: bob.uid },
        { ...firstCommand, action: "transfer_payment" },
        { ...firstCommand, binding: { ...firstCommand.binding, plan_version: firstCommand.binding.plan_version + 1 } },
        { ...firstCommand, binding: { ...firstCommand.binding, policy_version: "outdated-policy" } },
        { ...firstCommand, binding: { ...firstCommand.binding, owner_id: bob.uid } },
      ]) {
        const result = await request(base, "POST", "/api/cases", alice.token, body);
        assert([400, 404, 409].includes(result.status)); assert(!result.body.case_id);
      }
    }));
    await check("Read-only recovery of an uncommitted command cannot create a case", async () => noBusinessWrites(async () => {
      const beforeCalls = modelCalls;
      const result = await request(base, "POST", "/api/cases/recover", alice.token, firstCommand);
      assert.equal(result.status, 404); assert.equal(result.body.error.code, "CASE_NOT_COMMITTED");
      assert(!result.body.case_id); assert(!result.body.committed); assert(!result.body.verified);
      assert.equal(modelCalls, beforeCalls);
    }));
    await check("Concurrent same and different client keys create one case, approval and success audit", async () => {
      const beforeCalls = modelCalls;
      const independentlyPrepared = await prepare(alice, firstPlan);
      const commands = [firstCommand, firstCommand, ...Array.from({ length: 6 }, () => command(firstIntent)), command(independentlyPrepared), command(independentlyPrepared)];
      const results = await Promise.all(commands.map((body) => request(base, "POST", "/api/cases", alice.token, body)));
      results.forEach((result) => { assert.equal(result.status, 200); assert.equal(result.body.committed, true); assert(!("verified" in result.body)); assert(!("case" in result.body)); });
      const ids = new Set(results.map((result) => result.body.case_id)); assert.equal(ids.size, 1);
      firstCaseId = [...ids][0];
      const count = await counts();
      assert.equal(count.cases, 1); assert.equal(count.approvals, 1); assert.equal(count.audit, 1); assert.equal(count.idempotency, 9);
      assert.equal(modelCalls, beforeCalls, "Model calls must not occur inside case transactions or retries.");
      const caseDoc = (await db.collection(`${namespace}_cases`).doc(firstCaseId).get()).data();
      const auditDoc = (await db.collection(`${namespace}_audit`).doc(firstCaseId).get()).data();
      const approvalDoc = (await db.collection(`${namespace}_approvals`).doc(caseDoc.approval_id).get()).data();
      assert.equal(auditDoc.event, "CASE_CREATED"); assert.equal(auditDoc.owner_id, alice.uid);
      assert.equal(approvalDoc.owner_id, alice.uid); assert.equal(approvalDoc.approved_at, caseDoc.created_at);
      return { concurrent_requests: commands.length, separately_prepared_intents: 2, case_id: firstCaseId, counts: count, model_calls_during_confirmation: 0 };
    });
    await check("Independent readback verifies the stored case and cross-owner case access stays denied", async () => {
      const read = await request(base, "GET", `/api/cases/${firstCaseId}`, alice.token);
      assert.equal(read.status, 200); assert.equal(read.body.verified, true); assert.equal(read.body.case.case_id, firstCaseId);
      assert.equal(read.body.case.amount_minor, 3800); assert.equal(read.body.case.synthetic, true);
      const other = await request(base, "GET", `/api/cases/${firstCaseId}`, bob.token);
      assert.equal(other.status, 404); assert(!other.body.case);
      const unknown = await request(base, "GET", "/api/cases/case_unknown", bob.token);
      assert.deepEqual(other.body, unknown.body, "Missing and other-owner cases must disclose the same error.");
      return { case_id: firstCaseId, independent_get_verified: true };
    });
    await check("A committed result remains recoverable after confirmation expiry", async () => {
      clock.now = Date.parse(firstIntent.expires_at) + 1;
      const before = await counts();
      const replay = await request(base, "POST", "/api/cases", alice.token, firstCommand);
      assert.equal(replay.status, 200); assert.equal(replay.body.replayed, true); assert.equal(replay.body.case_id, firstCaseId);
      const read = await request(base, "GET", `/api/cases/${firstCaseId}`, alice.token);
      assert.equal(read.status, 200); assert.equal(read.body.verified, true);
      assert.deepEqual(await counts(), before);
    });
    await check("Same owner key with a different valid command is rejected", async () => {
      const second = await plan(alice);
      const intent = await prepare(alice, second);
      return noBusinessWrites(async () => {
        const result = await request(base, "POST", "/api/cases", alice.token, command(intent, firstCommand.idempotency_key));
        assert.equal(result.status, 409); assert.equal(result.body.error.code, "IDEMPOTENCY_CONFLICT");
      });
    });
    await check("Read-only recovery after expiry and a new input returns the original case without writes", async () => noBusinessWrites(async () => {
      const beforeCalls = modelCalls;
      const result = await request(base, "POST", "/api/cases/recover", alice.token, firstCommand);
      assert.equal(result.status, 200); assert.equal(result.body.case_id, firstCaseId);
      assert.equal(result.body.committed, true); assert.equal(result.body.replayed, true);
      const read = await request(base, "GET", `/api/cases/${firstCaseId}`, alice.token);
      assert.equal(read.status, 200); assert.equal(read.body.verified, true);
      const other = await request(base, "POST", "/api/cases/recover", bob.token, firstCommand);
      assert.equal(other.status, 404); assert(!other.body.case_id);
      assert.equal(modelCalls, beforeCalls);
    }));
    await check("Equal client key strings are independently scoped to different owners", async () => {
      const otherPlan = await plan(bob); const otherIntent = await prepare(bob, otherPlan);
      const result = await request(base, "POST", "/api/cases", bob.token, command(otherIntent, firstCommand.idempotency_key));
      assert.equal(result.status, 200); assert.notEqual(result.body.case_id, firstCaseId);
      const ownedHistory = await request(base, "GET", "/api/cases", bob.token);
      assert.equal(ownedHistory.status, 200); assert.equal(ownedHistory.body.cases.length, 1);
      assert(ownedHistory.body.cases.every((item) => item.owner_id === bob.uid));
      return { distinct_owner_case_id: result.body.case_id, owner_case_count: 1 };
    });
    await check("Rejected plans cannot create a case", async () => {
      const workflow = await plan(alice); const intent = await prepare(alice, workflow);
      const rejection = await request(base, "POST", `/api/runs/${workflow.run_id}/reject`, alice.token, { binding: workflow.workflow.binding });
      assert.equal(rejection.status, 200); assert.equal(rejection.body.run.status, "REJECTED");
      return noBusinessWrites(async () => {
        const result = await request(base, "POST", "/api/cases", alice.token, command(intent));
        assert.equal(result.status, 409); assert.equal(result.body.error.code, "PLAN_NOT_REVIEWABLE");
      });
    });
    await check("A newer input invalidates a previously reviewed confirmation", async () => {
      const older = await plan(alice); const intent = await prepare(alice, older);
      const newer = await plan(alice);
      assert(newer.workflow.binding.input_version > older.workflow.binding.input_version);
      return noBusinessWrites(async () => {
        const result = await request(base, "POST", "/api/cases", alice.token, command(intent));
        assert.equal(result.status, 409); assert.equal(result.body.error.code, "STALE_VERSION");
      });
    });
    await check("Explicit input invalidation prevents old-plan execution", async () => {
      const workflow = await plan(alice); const intent = await prepare(alice, workflow);
      const invalidated = await request(base, "POST", `/api/runs/${workflow.run_id}/invalidate`, alice.token, { binding: workflow.workflow.binding });
      assert.equal(invalidated.status, 200); assert.equal(invalidated.body.run.status, "INVALIDATED");
      return noBusinessWrites(async () => {
        const result = await request(base, "POST", "/api/cases", alice.token, command(intent)); assert.equal(result.status, 409);
      });
    });
    await check("Uncommitted confirmation at its expiry boundary cannot write", async () => {
      const workflow = await plan(alice); const intent = await prepare(alice, workflow);
      clock.now = Date.parse(intent.expires_at);
      return noBusinessWrites(async () => {
        const result = await request(base, "POST", "/api/cases", alice.token, command(intent));
        assert.equal(result.status, 409); assert.equal(result.body.error.code, "CONFIRMATION_EXPIRED");
      });
    });
    await check("Blocked source conflicts cannot prepare confirmation or create cases", async () => {
      const workflow = await plan(alice, "DEV-10");
      assert.equal(workflow.workflow.status, "BLOCKED"); assert.equal(workflow.workflow.plan, null);
      return noBusinessWrites(async () => {
        const result = await request(base, "POST", `/api/runs/${workflow.run_id}/confirmation`, alice.token, { binding: workflow.workflow.binding });
        assert.equal(result.status, 409); assert.equal(result.body.error.code, "PLAN_NOT_REVIEWABLE");
      });
    });
    await check("Tampered persisted plan is vetoed before any business commit", async () => {
      const workflow = await plan(alice); const intent = await prepare(alice, workflow);
      const ref = db.collection(`${namespace}_runs`).doc(workflow.run_id);
      const original = (await ref.get()).data();
      const tampered = structuredClone(original);
      tampered.workflow_response.workflow.plan.proposed_case.amount_minor++;
      await ref.set(tampered);
      try {
        return await noBusinessWrites(async () => {
          const result = await request(base, "POST", "/api/cases", alice.token, command(intent));
          assert.equal(result.status, 409); assert(!result.body.case_id);
        });
      } finally { await ref.set(original); }
    });
    let recoveryCommand;
    let recoveryCaseId;
    await check("Discarded create response recovers the same durable case with the original command", async () => {
      const workflow = await plan(alice); const intent = await prepare(alice, workflow);
      recoveryCommand = command(intent);
      await request(base, "POST", "/api/cases", alice.token, recoveryCommand); // Deliberately discard the first response.
      const count = await counts();
      const replay = await request(base, "POST", "/api/cases", alice.token, recoveryCommand);
      assert.equal(replay.status, 200); assert.equal(replay.body.replayed, true);
      recoveryCaseId = replay.body.case_id;
      assert.deepEqual(await counts(), count);
      const read = await request(base, "GET", `/api/cases/${recoveryCaseId}`, alice.token);
      assert.equal(read.status, 200); assert.equal(read.body.verified, true);
      return { fault_model: "first_create_response_discarded_by_test_client", recovered_case_id: recoveryCaseId, duplicate_cases: 0 };
    });
    await check("Independent readback outage reports unavailable and retry finds the committed case", async () => {
      const before = await counts(); failReadback = true;
      const failed = await request(base, "GET", `/api/cases/${recoveryCaseId}`, alice.token);
      assert.equal(failed.status, 503); assert.equal(failed.body.error.code, "CASE_STORAGE_UNAVAILABLE");
      assert(!failed.body.verified); assert(!failed.body.case);
      const recovered = await request(base, "GET", `/api/cases/${recoveryCaseId}`, alice.token);
      assert.equal(recovered.status, 200); assert.equal(recovered.body.case.case_id, recoveryCaseId);
      assert.deepEqual(await counts(), before);
    });
    await check("HTTP service restart restores owned history and case readback from Firestore", async () => {
      await closeServer(server); server = null;
      // Replace the service object as well as the HTTP server; only emulator data and auth survive.
      runtime.caseService = new CaseService({ store: new FirestoreCaseStore(db, namespace), now: () => clock.now });
      await startServer();
      const history = await request(base, "GET", "/api/cases", alice.token);
      assert.equal(history.status, 200); assert(history.body.cases.some((item) => item.case_id === recoveryCaseId));
      assert(history.body.cases.every((item) => item.owner_id === alice.uid));
      const replay = await request(base, "POST", "/api/cases", alice.token, recoveryCommand);
      assert.equal(replay.status, 200); assert.equal(replay.body.case_id, recoveryCaseId);
      const read = await request(base, "GET", `/api/cases/${recoveryCaseId}`, alice.token);
      assert.equal(read.status, 200); assert.equal(read.body.verified, true);
      runtime.caseService = service;
      await closeServer(server); server = null; await startServer();
      return { recovered_case_id: recoveryCaseId, storage: "Firestore emulator, new service object", browser_refresh_not_claimed: true };
    });
    await check("Abort after buffered transaction writes commits no partial business result", async () => {
      const workflow = await plan(alice); const intent = await prepare(alice, workflow);
      const result = await noBusinessWrites(async () => {
        abortTransaction = true;
        const response = await request(base, "POST", "/api/cases", alice.token, command(intent));
        assert.equal(response.status, 503); assert(!response.body.case_id);
      });
      const run = await request(base, "GET", `/api/runs/${workflow.run_id}`, alice.token);
      assert.equal(run.body.run.status, "REVIEWABLE"); assert.equal(run.body.run.case_id, null);
      return { ...result, injected_at: "transaction callback after buffered writes before commit" };
    });
    await check("Retried Firestore transaction commits one result and runs zero model side effects", async () => {
      const workflow = await plan(alice); const intent = await prepare(alice, workflow);
      const before = await counts(); const beforeCalls = modelCalls;
      retryCallbacks = 0; retryTransaction = true;
      const response = await request(base, "POST", "/api/cases", alice.token, command(intent));
      assert.equal(response.status, 200); assert.equal(retryCallbacks, 2);
      const after = await counts();
      for (const kind of ["cases", "approvals", "audit", "idempotency"]) assert.equal(after[kind], before[kind] + 1);
      assert.equal(modelCalls, beforeCalls);
      return { callback_attempts: retryCallbacks, counts_before: before, counts_after: after, model_calls_during_confirmation: 0 };
    });
    await check("Direct authenticated and anonymous Firestore client reads and writes are denied", async () => {
      const before = await counts();
      const endpoint = `http://${firestoreHost}/v1/projects/${DEMO_PROJECT}/databases/(default)/documents/${namespace}_cases/${firstCaseId}`;
      for (const token of [null, alice.token]) {
        const headers = token ? { authorization: `Bearer ${token}` } : {};
        const read = await fetch(endpoint, { headers, signal: AbortSignal.timeout(10000) });
        assert.equal(read.status, 403); await read.arrayBuffer();
        const write = await fetch(`${endpoint}_forged`, { method: "PATCH", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ fields: { owner_id: { stringValue: alice.uid } } }), signal: AbortSignal.timeout(10000) });
        assert.equal(write.status, 403); await write.arrayBuffer();
      }
      assert.deepEqual(await counts(), before);
      return { denied_direct_reads: 2, denied_direct_writes: 2 };
    });
    const report = {
      schema_version: "1.0.0", stage: "S3", mode: "auth-and-firestore-emulators",
      started_at: startedAt, completed_at: new Date().toISOString(),
      project_id: DEMO_PROJECT, auth_host: authHost, firestore_host: firestoreHost,
      storage_namespace: namespace, final_counts: await counts(),
      source_snapshot: sources, policy_version: POLICY_VERSION, prompt_versions: PROMPT_VERSIONS,
      requested_model_id: "gemini-3.1-flash-lite", observed_provider_model: "offline-public-fixture",
      model_source: "injected-public-development-fixtures", injected_provider_calls: modelCalls,
      real_gemini_calls: 0, production_firebase_writes: 0, real_resource_g3: "PENDING",
      checks, passed: checks.filter((item) => item.outcome === "PASS").length,
      failed: checks.filter((item) => item.outcome === "FAIL").length,
    };
    if (reportPath) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    console.log(JSON.stringify({ stage: "S3", mode: report.mode, passed: report.passed, failed: report.failed, real_resource_g3: report.real_resource_g3 }));
    if (report.failed) process.exitCode = 1;
  } finally {
    await closeServer(server);
    await db.terminate();
    await deleteApp(adminApp);
  }
}

main().catch((error) => { console.error(safeMessage(error)); process.exitCode = 1; });
