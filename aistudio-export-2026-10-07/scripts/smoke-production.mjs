import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import net from "node:net";
import { devNull } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const appDirectory = fileURLToPath(new URL("../", import.meta.url));
const cancellation = new AbortController();
const checks = [];
let ownedServer;

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => cancellation.abort(new Error(`Interrupted by ${signal}.`)));
}

function assertRunning() {
  cancellation.signal.throwIfAborted();
  assert(ownedServer && !ownedServer.exited, "The production server exited before checks completed.");
}

async function chooseEphemeralPort() {
  const reservation = net.createServer();
  await new Promise((resolve, reject) => {
    reservation.once("error", reject);
    reservation.listen(0, "127.0.0.1", resolve);
  });
  const address = reservation.address();
  assert(address && typeof address === "object", "Could not reserve a local port.");
  await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

function childEnvironment(port) {
  // Do not inherit credentials, NODE_OPTIONS, proxies, or dotenv overrides.
  const environment = {};
  const permittedNames = new Set(["path", "systemroot", "windir", "temp", "tmp"]);
  for (const [name, value] of Object.entries(process.env)) {
    if (permittedNames.has(name.toLowerCase()) && value !== undefined) environment[name] = value;
  }
  return {
    ...environment,
    NODE_ENV: "production",
    PORT: String(port),
    GEMINI_MODEL: "gemini-3.1-flash-lite",
    GEMINI_API_KEY: "",
    GOOGLE_API_KEY: "",
    DOTENV_CONFIG_PATH: devNull,
    DOTENV_CONFIG_QUIET: "true",
  };
}

async function stopOwnedServer() {
  const server = ownedServer;
  if (!server || server.exited) return;
  server.child.kill("SIGTERM");
  await Promise.race([server.closed, delay(3_000, undefined, { ref: false })]);
  if (!server.exited) {
    server.child.kill("SIGKILL");
    await Promise.race([server.closed, delay(3_000, undefined, { ref: false })]);
  }
  assert(server.exited, "The smoke script could not stop its own server process.");
}

async function startOwnedServer() {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    cancellation.signal.throwIfAborted();
    const port = await chooseEphemeralPort();
    const child = spawn(process.execPath, ["server.ts"], {
      cwd: appDirectory,
      env: childEnvironment(port),
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const server = { child, port, exited: false, listening: false, portInUse: false, spawnError: false };
    ownedServer = server;
    server.closed = new Promise((resolve) => {
      child.once("close", () => { server.exited = true; resolve(); });
      child.once("error", () => { server.spawnError = true; });
    });
    let startupOutput = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      startupOutput = (startupOutput + chunk).slice(-4_096);
      server.listening = startupOutput.includes(`OpsCrew server listening on http://0.0.0.0:${port}`);
    });
    child.stderr.on("data", (chunk) => {
      // Never echo child output: only recognize the retryable port-reservation race.
      server.portInUse ||= chunk.includes("EADDRINUSE");
    });
    const deadline = Date.now() + 15_000;
    while (!server.exited && !server.spawnError && !server.listening && Date.now() < deadline) {
      cancellation.signal.throwIfAborted();
      await delay(50);
    }
    if (server.listening && !server.exited) return `http://127.0.0.1:${port}`;
    await stopOwnedServer();
    if (server.portInUse && attempt < 3) continue;
    throw new Error(server.spawnError
      ? "Could not spawn Node for the production server."
      : "Production server did not become ready. Run Node 24 and build the frontend first.");
  }
  throw new Error("Could not obtain an unused ephemeral port after three attempts.");
}

async function request(baseUrl, route, options = {}) {
  assertRunning();
  const url = new URL(route, baseUrl);
  assert.equal(url.origin, baseUrl, "Smoke requests must stay on the owned local server.");
  const response = await fetch(url, {
    ...options,
    redirect: "error",
    signal: AbortSignal.any([cancellation.signal, AbortSignal.timeout(5_000)]),
  });
  const body = await response.text();
  assertRunning();
  return { response, body };
}

async function requestJson(baseUrl, route, expectedStatus, options) {
  const { response, body } = await request(baseUrl, route, options);
  assert.equal(response.status, expectedStatus, `${route} returned an unexpected status.`);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i,
    `${route} must return JSON, including on failure.`);
  return JSON.parse(body);
}

async function runChecks(baseUrl) {
  const root = await request(baseUrl, "/");
  assert.equal(root.response.status, 200);
  assert.match(root.response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.match(root.body, /id=["']root["']/);
  checks.push("root HTML served from dist");

  const scriptPath = root.body.match(/<script\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1];
  assert(scriptPath, "The built page must reference a JavaScript asset.");
  assert(new URL(scriptPath, baseUrl).pathname.startsWith("/assets/"), "Expected a built Vite asset.");
  const asset = await request(baseUrl, scriptPath);
  assert.equal(asset.response.status, 200);
  assert.match(asset.response.headers.get("content-type") ?? "", /(?:application|text)\/javascript\b/i);
  assert(asset.body.length > 0, "Built JavaScript must not be empty.");
  checks.push("built JavaScript asset served");

  const refresh = await request(baseUrl, "/smoke/refresh/check");
  assert.equal(refresh.response.status, 200);
  assert.match(refresh.response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(refresh.body, root.body, "SPA refresh should return the built index page.");
  checks.push("nested SPA refresh served");

  const health = await requestJson(baseUrl, "/api/health", 200);
  assert.equal(health.ok, true);
  assert.equal(health.service, "opscrew");
  assert.equal(health.stage, "S3");
  checks.push("production health JSON");

  const config = await requestJson(baseUrl, "/api/config", 200);
  assert.equal(config.ok, true);
  assert.equal(config.api_key_configured, false, "Smoke must never start with a Gemini key.");
  assert.equal(config.default_model, "gemini-3.1-flash-lite");
  assert(Array.isArray(config.allowed_models) && config.allowed_models.includes(config.default_model));
  assert(!Object.hasOwn(config, "api_key"), "Configuration must not return a key.");
  checks.push("non-sensitive configuration JSON without credentials");

  const missingKey = await requestJson(baseUrl, "/api/analyze", 500, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      description: "Synthetic test: EMP-1042 spent $125.50 on a team meal; receipt missing.",
      amount_usd: "125.50",
      receipt_status: "missing",
      employee_identifier: "EMP-1042",
    }),
  });
  assert.equal(missingKey.ok, false);
  assert.equal(missingKey.error?.code, "MISSING_API_KEY");
  assert.equal(missingKey.http_status, 500);
  assert.equal(missingKey.upstream_status, null);
  assert(!Object.hasOwn(missingKey, "facts"), "Missing credentials must not produce fabricated facts.");
  checks.push("missing-key analysis fails before any Gemini call");

  const missingWorkflowKey = await requestJson(baseUrl, "/api/workflow", 500, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ description: "[SYNTHETIC] EMP-1042 spent $38.00; receipt missing.", amount_usd: "38.00", receipt_status: "missing", employee_identifier: "EMP-1042" }),
  });
  assert.equal(missingWorkflowKey.error?.code, "MISSING_API_KEY");
  assert.equal(missingWorkflowKey.facts, null);
  assert.equal(missingWorkflowKey.workflow, null);
  assert.deepEqual(missingWorkflowKey.steps, []);
  checks.push("missing-key workflow fails without facts, plan or model attempts");

  const notFound = await requestJson(baseUrl, "/api/smoke-route-that-does-not-exist", 404);
  assert.equal(notFound.ok, false);
  assert.equal(notFound.error?.code, "API_ROUTE_NOT_FOUND");
  assert.equal(notFound.http_status, 404);
  checks.push("unknown API route returns JSON 404");
}

const startedAt = Date.now();
try {
  assert.equal(Number(process.versions.node.split(".")[0]), 24, "Use Node 24 for the production smoke.");
  await access(path.join(appDirectory, "dist", "index.html"));
  const baseUrl = await startOwnedServer();
  await runChecks(baseUrl);
  await stopOwnedServer();
  console.log(JSON.stringify({ ok: true, mode: "production-without-credentials", checks, elapsed_ms: Date.now() - startedAt }, null, 2));
} catch (error) {
  console.error(`Production smoke failed: ${error instanceof Error ? error.message : "Unknown error."}`);
  process.exitCode = 1;
} finally {
  try { await stopOwnedServer(); }
  catch (error) {
    console.error(error instanceof Error ? error.message : "Could not stop the owned server.");
    process.exitCode = 1;
  }
}
