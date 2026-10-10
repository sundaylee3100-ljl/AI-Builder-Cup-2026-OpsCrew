import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { CaseService, FirestoreCaseStore } from "./case-service.ts";

export interface FirebaseCaseConfig {
  enabled: boolean;
  mode: "disabled" | "emulator" | "firestore";
  firebase: { apiKey: string; authDomain: string; projectId: string; appId: string } | null;
  auth_emulator_url: string | null;
}
export type VerifySessionToken = (token: string) => Promise<{uid: string}>;
export interface FirebaseRuntime {
  config: FirebaseCaseConfig;
  caseService: CaseService | null;
  verifyIdToken: VerifySessionToken | null;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured when the case backend is enabled.`);
  return value;
}
function loopbackHost(value: string, label: string): string {
  if (!/^127\.0\.0\.1:\d{2,5}$/.test(value)) throw new Error(`${label} must use an explicit 127.0.0.1 emulator port.`);
  const port = Number(value.split(":")[1]);
  if (port < 1 || port > 65535) throw new Error(`${label} has an invalid port.`);
  return value;
}

/** Explicit opt-in only. Unconfigured storage stays unavailable and cannot fall back to memory. */
export function createFirebaseRuntime(env: NodeJS.ProcessEnv = process.env): FirebaseRuntime {
  const mode = env.OPSCREW_FIREBASE_MODE?.trim() || "disabled";
  if (mode === "disabled") return {config: {enabled: false, mode: "disabled", firebase: null, auth_emulator_url: null}, caseService: null, verifyIdToken: null};
  if (mode !== "emulator" && mode !== "firestore") throw new Error("OPSCREW_FIREBASE_MODE must be disabled, emulator, or firestore.");
  const projectId = required(env, "FIREBASE_PROJECT_ID");
  if (!/^[a-z][a-z0-9-]{4,62}$/.test(projectId)) throw new Error("FIREBASE_PROJECT_ID is invalid.");
  let authEmulatorUrl: string | null = null;
  if (mode === "emulator") {
    if (env.NODE_ENV === "production" || process.env.NODE_ENV === "production" || !projectId.startsWith("demo-")) throw new Error("Emulator mode requires a demo- project and a nonproduction loopback service.");
    const authHost = loopbackHost(required(env, "FIREBASE_AUTH_EMULATOR_HOST"), "FIREBASE_AUTH_EMULATOR_HOST");
    const firestoreHost = loopbackHost(required(env, "FIRESTORE_EMULATOR_HOST"), "FIRESTORE_EMULATOR_HOST");
    // The Admin SDK consumes process environment. Never silently change global routing.
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== authHost || process.env.FIRESTORE_EMULATOR_HOST !== firestoreHost) throw new Error("Emulator host configuration must match the explicitly configured process environment.");
    authEmulatorUrl = `http://${authHost}`;
  } else if (env.FIREBASE_AUTH_EMULATOR_HOST || env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST || projectId.startsWith("demo-")) {
    throw new Error("Firestore mode cannot use emulator hosts or a demo- project.");
  }
  const firebase = {
    apiKey: required(env, "FIREBASE_WEB_API_KEY"),
    authDomain: required(env, "FIREBASE_AUTH_DOMAIN"),
    projectId,
    appId: required(env, "FIREBASE_WEB_APP_ID"),
  };
  const modelSecrets = [env.GEMINI_API_KEY, process.env.GEMINI_API_KEY].map((value) => value?.trim()).filter(Boolean);
  if (firebase.apiKey.startsWith("AQ.") || modelSecrets.includes(firebase.apiKey)) throw new Error("FIREBASE_WEB_API_KEY must be the separate public Firebase web configuration key, never the server Gemini secret.");
  if (!/^[a-zA-Z0-9.-]+$/.test(firebase.authDomain) || firebase.authDomain.includes("..")) throw new Error("FIREBASE_AUTH_DOMAIN is invalid.");
  const name = `opscrew-s3-${mode}-${projectId}`;
  const app = getApps().find((candidate) => candidate.name === name) ?? initializeApp(
    mode === "emulator" ? {projectId} : {projectId, credential: applicationDefault()}, name,
  );
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  return {
    config: {enabled: true, mode, firebase, auth_emulator_url: authEmulatorUrl},
    caseService: new CaseService({store: new FirestoreCaseStore(firestore)}),
    verifyIdToken: async (token) => {
      // Admin verifies issuer, audience, signature and expiration. Production also checks revocation.
      const decoded = await auth.verifyIdToken(token, mode === "firestore");
      if (typeof decoded.uid !== "string" || !decoded.uid || decoded.uid.length > 128) throw new Error("Invalid verified session identity.");
      return {uid: decoded.uid};
    },
  };
}
