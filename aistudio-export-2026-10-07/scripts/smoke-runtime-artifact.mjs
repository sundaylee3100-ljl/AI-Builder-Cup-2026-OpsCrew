import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Verify the exact files copied into the Docker runtime, with a fresh production-only install.
// This is a native Windows/Linux check; it does not claim an image build or Linux container run.
const source = fileURLToPath(new URL("../", import.meta.url));
const started = Date.now();
const checks = [];
let artifact;

function environment() {
  const permitted = new Set(["path", "systemroot", "windir", "temp", "tmp"]);
  return Object.fromEntries(Object.entries(process.env).filter(([name, value]) => permitted.has(name.toLowerCase()) && value !== undefined));
}

async function command(arguments_, cwd, timeout = 180_000) {
  const child = spawn(process.execPath, arguments_, { cwd, env: environment(), shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output = (output + chunk).slice(-20_000); });
  child.stderr.on("data", () => {});
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeout);
  try {
    const code = await new Promise((resolve, reject) => { child.once("error", reject); child.once("close", resolve); });
    assert.equal(timedOut, false, "Owned artifact command timed out.");
    assert.equal(code, 0, "Owned artifact command failed; rerun the corresponding dependency/smoke check locally.");
    return output;
  } finally { clearTimeout(timer); }
}

try {
  assert([22, 24].includes(Number(process.versions.node.split(".")[0])), "Use Node 22 or 24.");
  const npmCli = process.env.npm_execpath;
  assert(npmCli && path.isAbsolute(npmCli), "Run this script through npm run smoke:artifact.");
  artifact = await mkdtemp(path.join(tmpdir(), "opscrew-runtime-"));
  for (const entry of ["package.json", "package-lock.json", "server.ts", "server", "src/domain", "dist"]) {
    await mkdir(path.dirname(path.join(artifact, entry)), { recursive: true });
    await cp(path.join(source, entry), path.join(artifact, entry), { recursive: true });
  }
  await mkdir(path.join(artifact, "scripts"));
  await cp(path.join(source, "scripts/smoke-production.mjs"), path.join(artifact, "scripts/smoke-production.mjs"));
  checks.push("exact Docker runtime source layout copied");
  await command([npmCli, "ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], artifact, 300_000);
  checks.push("fresh lockfile-based production-only dependency install (lifecycle scripts skipped)");
  const dependencyProbe = `import assert from 'node:assert/strict'; for (const name of ['express','dotenv','@google/genai','firebase-admin/app','firebase-admin/auth','firebase-admin/firestore']) await import(name); for (const name of ['vite','tsx','firebase-tools','typescript']) { let absent = false; try { import.meta.resolve(name); } catch (error) { absent = error.code === 'ERR_MODULE_NOT_FOUND'; } assert(absent, name + ' must be omitted'); }`;
  await command(["--input-type=module", "-e", dependencyProbe], artifact);
  checks.push("server SDK imports work without Vite, tsx, Firebase CLI, or TypeScript");
  const output = await command(["scripts/smoke-production.mjs"], artifact, 30_000);
  const smoke = JSON.parse(output);
  assert.equal(smoke.ok, true);
  checks.push(...smoke.checks);
  const manifest = JSON.parse(await readFile(path.join(artifact, "package.json"), "utf8"));
  console.log(JSON.stringify({ ok: true, mode: "native-production-artifact-without-credentials", node: process.versions.node, package_version: manifest.version, container_build: "NOT_RUN", checks, elapsed_ms: Date.now() - started }, null, 2));
} catch (error) {
  console.error(`Native runtime artifact check failed: ${error instanceof Error ? error.message : "Unknown error."}`);
  process.exitCode = 1;
} finally {
  if (artifact) {
    // Delete only the exact new directory created above, never a computed existing checkout.
    assert(path.dirname(artifact) === path.resolve(tmpdir()) && path.basename(artifact).startsWith("opscrew-runtime-"));
    await rm(artifact, { recursive: true, force: true });
  }
}
