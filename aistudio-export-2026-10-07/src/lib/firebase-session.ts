import { useCallback, useEffect, useRef, useState } from "react";
import type { Auth } from "firebase/auth";

export interface CaseBackendConfig {
  enabled: boolean;
  mode: "emulator" | "firestore" | "disabled";
  firebase: { apiKey: string; authDomain?: string; projectId: string; appId?: string } | null;
  auth_emulator_url?: string | null;
}

export interface VisitorSession {
  uid: string | null;
  ready: boolean;
  busy: boolean;
  error: string;
  start: () => Promise<void>;
  end: () => Promise<void>;
  headers: () => Promise<Record<string, string>>;
}

function isLoopback(host: string): boolean {
  return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(host);
}

export function validateBrowserSessionConfig(config: CaseBackendConfig, hostname: string): void {
  if (!config.enabled) return;
  if (!config.firebase?.apiKey || !config.firebase.projectId) {
    throw new Error("Firebase visitor access is not configured. Case creation is unavailable.");
  }
  if (config.mode === "emulator") {
    const emulator = new URL(config.auth_emulator_url ?? "");
    if (!isLoopback(hostname) || !isLoopback(emulator.hostname) || emulator.protocol !== "http:" ||
      emulator.username || emulator.password || emulator.pathname !== "/" || emulator.search || emulator.hash) {
      throw new Error("Local emulator access is allowed only from an explicitly configured localhost preview.");
    }
  } else if (config.mode !== "firestore" || config.auth_emulator_url) {
    throw new Error("Invalid Firebase session configuration. Case creation is unavailable.");
  }
}

// Anonymous Firebase identities are explicit visitor sessions, not fabricated local users.
// Firebase keeps credentials in its tab-session persistence; this app never saves ID tokens.
export function useFirebaseSession(config: CaseBackendConfig | null): VisitorSession {
  const [uid, setUid] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const authRef = useRef<Auth | null>(null);
  const configKey = JSON.stringify(config);

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    authRef.current = null;
    setUid(null);
    setReady(false);
    setError("");
    if (!config?.enabled) { setReady(true); return; }
    void (async () => {
      try {
        validateBrowserSessionConfig(config, window.location.hostname);
        const [{ initializeApp, getApps }, authSdk] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
        if (disposed) return;
        const appName = `opscrew-${config.mode}-${config.firebase!.projectId}`;
        const app = getApps().find((candidate) => candidate.name === appName) ?? initializeApp(config.firebase!, appName);
        const auth = authSdk.getAuth(app);
        if (config.mode === "emulator" && !auth.emulatorConfig) {
          authSdk.connectAuthEmulator(auth, config.auth_emulator_url!, { disableWarnings: false });
        }
        await authSdk.setPersistence(auth, authSdk.browserSessionPersistence);
        if (disposed) return;
        authRef.current = auth;
        unsubscribe = authSdk.onAuthStateChanged(auth, (user) => {
          if (disposed) return;
          setUid(user?.uid ?? null);
          setReady(true);
          setBusy(false);
        }, () => {
          if (disposed) return;
          setError("Firebase could not verify the visitor session. Try signing in again.");
          setUid(null);
          setReady(true);
        });
      } catch {
        if (disposed) return;
        setError("Visitor access could not start. Check the configured Firebase project or local emulators.");
        setReady(true);
      }
    })();
    return () => { disposed = true; unsubscribe?.(); authRef.current = null; };
    // Serialized public config prevents needless session resets from object identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey]);

  const start = useCallback(async () => {
    const auth = authRef.current;
    if (!auth) { setError("Visitor access is unavailable until Firebase is configured."); return; }
    setBusy(true);
    setError("");
    try {
      const { signInAnonymously } = await import("firebase/auth");
      await signInAnonymously(auth);
    } catch {
      setError("Visitor sign-in failed. Check that anonymous sign-in is enabled and the service is reachable.");
    } finally { setBusy(false); }
  }, []);

  const end = useCallback(async () => {
    const auth = authRef.current;
    if (!auth) return;
    setBusy(true);
    setError("");
    try { const { signOut } = await import("firebase/auth"); await signOut(auth); }
    catch { setError("Sign-out failed. Try again before switching visitor identity."); }
    finally { setBusy(false); }
  }, []);

  const headers = useCallback(async () => {
    const auth = authRef.current;
    const user = auth?.currentUser;
    if (!user) throw new Error("Start a visitor session before running a saved workflow.");
    const token = await user.getIdToken();
    if (authRef.current !== auth || auth.currentUser?.uid !== user.uid) {
      throw new Error("The visitor identity changed. Start again with the current session.");
    }
    return { Authorization: `Bearer ${token}` };
  }, []);

  return { uid, ready, busy, error, start, end, headers };
}
