import assert from "node:assert/strict";
import { test } from "node:test";
import { deleteApp, getApps } from "firebase-admin/app";
import { createFirebaseRuntime } from "../server/firebase-runtime.ts";

const emulatorConfig = {
  OPSCREW_FIREBASE_MODE: "emulator",
  FIREBASE_PROJECT_ID: "demo-opscrew-s3",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_WEB_API_KEY: "emulator-only-placeholder",
  FIREBASE_AUTH_DOMAIN: "demo-opscrew-s3.firebaseapp.com",
  FIREBASE_WEB_APP_ID: "emulator-only-placeholder",
};

async function withoutEmulatorEnvironment(run: () => void | Promise<void>) {
  const names = ["FIREBASE_AUTH_EMULATOR_HOST", "FIRESTORE_EMULATOR_HOST"] as const;
  const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  for (const name of names) delete process.env[name];
  try { await run(); }
  finally {
    for (const name of names) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  }
}

test("Unconfigured Firebase stays disabled without an in-memory execution fallback", () => {
  const runtime = createFirebaseRuntime({});
  assert.deepEqual(runtime.config, { enabled: false, mode: "disabled", firebase: null, auth_emulator_url: null });
  assert.equal(runtime.caseService, null); assert.equal(runtime.verifyIdToken, null);
});

test("Unknown Firebase mode and missing project fail before a service is initialized", () => {
  assert.throws(() => createFirebaseRuntime({ OPSCREW_FIREBASE_MODE: "automatic" }), /must be disabled, emulator, or firestore/);
  assert.throws(() => createFirebaseRuntime({ OPSCREW_FIREBASE_MODE: "firestore" }), /FIREBASE_PROJECT_ID must be configured/);
  assert.throws(() => createFirebaseRuntime({ ...emulatorConfig, FIREBASE_PROJECT_ID: "bad/project" }), /FIREBASE_PROJECT_ID is invalid/);
});

test("Production rejects emulator mode and emulator mode rejects a real project", () => {
  assert.throws(() => createFirebaseRuntime({ ...emulatorConfig, NODE_ENV: "production" }), /demo- project and a nonproduction loopback service/);
  assert.throws(() => createFirebaseRuntime({ ...emulatorConfig, FIREBASE_PROJECT_ID: "opscrew-fixture-project" }), /demo- project and a nonproduction loopback service/);
});

test("Emulator configuration rejects non-loopback hosts, protocols, bad ports and mixed routing", async () => {
  for (const host of ["remote.example:9099", "http://127.0.0.1:9099", "127.0.0.1:70000", "0.0.0.0:9099"]) {
    assert.throws(() => createFirebaseRuntime({ ...emulatorConfig, FIREBASE_AUTH_EMULATOR_HOST: host }), /explicit 127\.0\.0\.1|invalid port/);
  }
  assert.throws(() => createFirebaseRuntime({ ...emulatorConfig, FIRESTORE_EMULATOR_HOST: "192.168.1.2:8080" }), /explicit 127\.0\.0\.1/);
  assert.throws(() => createFirebaseRuntime({ ...emulatorConfig, FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:1" }), /explicit 127\.0\.0\.1/);
  await withoutEmulatorEnvironment(() => assert.throws(() => createFirebaseRuntime(emulatorConfig), /process environment/));
});

test("Real Firestore mode rejects demo projects and either configured emulator host", async () => {
  await withoutEmulatorEnvironment(() => {
    assert.throws(() => createFirebaseRuntime({ ...emulatorConfig, OPSCREW_FIREBASE_MODE: "firestore" }), /cannot use emulator hosts or a demo-/);
    for (const hostName of ["FIREBASE_AUTH_EMULATOR_HOST", "FIRESTORE_EMULATOR_HOST"]) {
      assert.throws(() => createFirebaseRuntime({
        OPSCREW_FIREBASE_MODE: "firestore", FIREBASE_PROJECT_ID: "opscrew-fixture-project",
        [hostName]: "127.0.0.1:8080",
      }), /cannot use emulator hosts or a demo-/);
    }
  });
});

test("Real Firestore mode detects process emulator routing even when custom config omits it", async () => {
  await withoutEmulatorEnvironment(() => {
    try {
      process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
      assert.throws(() => createFirebaseRuntime({ OPSCREW_FIREBASE_MODE: "firestore", FIREBASE_PROJECT_ID: "opscrew-fixture-project" }), /cannot use emulator hosts or a demo-/);
      delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
      process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
      assert.throws(() => createFirebaseRuntime({ OPSCREW_FIREBASE_MODE: "firestore", FIREBASE_PROJECT_ID: "opscrew-fixture-project" }), /cannot use emulator hosts or a demo-/);
    } finally { delete process.env.FIREBASE_AUTH_EMULATOR_HOST; delete process.env.FIRESTORE_EMULATOR_HOST; }
  });
});

test("Production token verifier rejects an unsigned emulator-shaped token before any cloud access", async () => {
  await withoutEmulatorEnvironment(async () => {
    const projectId = "opscrew-security-fixture";
    const runtime = createFirebaseRuntime({
      NODE_ENV: "production", OPSCREW_FIREBASE_MODE: "firestore", FIREBASE_PROJECT_ID: projectId,
      FIREBASE_WEB_API_KEY: "synthetic-public-config-placeholder",
      FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`, FIREBASE_WEB_APP_ID: "synthetic-app-placeholder",
    });
    const now = Math.floor(Date.now() / 1000);
    const token = `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({
      aud: projectId, iss: `https://securetoken.google.com/${projectId}`, sub: "SYNTHETIC-UID",
      iat: now, exp: now + 3600, auth_time: now,
      firebase: { identities: {}, sign_in_provider: "anonymous" },
    })).toString("base64url")}.`;
    try {
      assert(runtime.verifyIdToken);
      await assert.rejects(runtime.verifyIdToken(token), (error: unknown) => {
        assert.equal((error as {code?: string}).code, "auth/argument-error");
        assert.match((error as Error).message, /no.*kid.*claim|incorrect algorithm/);
        return true;
      });
    } finally {
      const app = getApps().find((candidate) => candidate.name === `opscrew-s3-firestore-${projectId}`);
      if (app) await deleteApp(app);
    }
  });
});

test("Public Firebase web configuration rejects a Gemini key prefix or the configured server key", async () => {
  await withoutEmulatorEnvironment(() => {
    const config = {
      OPSCREW_FIREBASE_MODE: "firestore", FIREBASE_PROJECT_ID: "opscrew-security-fixture",
      FIREBASE_AUTH_DOMAIN: "opscrew-security-fixture.firebaseapp.com", FIREBASE_WEB_APP_ID: "synthetic-app-placeholder",
    };
    assert.throws(() => createFirebaseRuntime({ ...config, FIREBASE_WEB_API_KEY: ["AQ", "fixture-only"].join(".") }), /never the server Gemini secret/);
    const syntheticServerKey = "synthetic-server-key-for-equality-test";
    assert.throws(() => createFirebaseRuntime({ ...config, FIREBASE_WEB_API_KEY: syntheticServerKey, GEMINI_API_KEY: syntheticServerKey }), /never the server Gemini secret/);
    const original = process.env.GEMINI_API_KEY;
    try {
      process.env.GEMINI_API_KEY = syntheticServerKey;
      assert.throws(() => createFirebaseRuntime({ ...config, FIREBASE_WEB_API_KEY: syntheticServerKey }), /never the server Gemini secret/);
    } finally {
      if (original === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = original;
    }
  });
});
