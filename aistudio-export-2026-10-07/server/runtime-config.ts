// Shared runtime configuration. No credential values are exported to the client.
import { GoogleGenAI, type ThinkingLevel } from "@google/genai";

// Dynamic proxy dispatcher for local dev environments behind proxy
if (typeof process !== "undefined" && (process.env.https_proxy || process.env.http_proxy)) {
  void import("undici").then(({ setGlobalDispatcher, ProxyAgent }) => {
    const proxyUrl = process.env.https_proxy || process.env.http_proxy;
    if (proxyUrl) {
      setGlobalDispatcher(new ProxyAgent(proxyUrl));
    }
  }).catch(() => {});
}

export const PORT = Number(process.env.PORT) || 3000;

export const ALLOWED_GEMINI_MODELS: readonly string[] = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

export interface VertexAiConfig {
  active: boolean;
  project?: string;
  location?: string;
}

export function isVertexAiActive(env: Record<string, string | undefined> = process.env): boolean {
  return (
    env.GOOGLE_GENAI_USE_VERTEXAI === "true" ||
    env.GOOGLE_GENAI_USE_VERTEXAI === "1" ||
    env.VERTEX_AI === "true" ||
    env.VERTEX_AI === "1"
  );
}

export function getVertexAiConfig(env: Record<string, string | undefined> = process.env): VertexAiConfig {
  const active = isVertexAiActive(env);
  return {
    active,
    project: env.GOOGLE_CLOUD_PROJECT || env.GCLOUD_PROJECT || "project-b2db87f6-7a4e-4020-972",
    location: env.GOOGLE_CLOUD_LOCATION || env.VERTEX_LOCATION || "us-central1",
  };
}

export const DEFAULT_GEMINI_MODEL = (() => {
  const configured = (process.env.GEMINI_MODEL || "").trim();
  if (configured && ALLOWED_GEMINI_MODELS.includes(configured)) {
    return configured;
  }
  return isVertexAiActive() ? "gemini-2.5-flash" : "gemini-3.1-flash-lite";
})();

export const GEMINI_SDK_TIMEOUT_MS = 40_000;
export const GEMINI_MAX_ATTEMPTS = 2;
export const ROUTE_ABORT_TIMEOUT_MS = 45_000;
export const WORKFLOW_ABORT_TIMEOUT_MS = 90_000;
export const PLANNING_CALL_TIMEOUT_MS = 30_000;
export const PLANNING_TOTAL_TIMEOUT_MS = 60_000;
export const PROMPT_VERSIONS = Object.freeze({
  facts: "opscrew-facts-1.1.0",
  planner: "opscrew-planner-1.0.1",
  reviewer: "opscrew-reviewer-1.0.1",
});

/** 2.5 and 3.1 models support temperature sampling; 3.8 and newer use thinkingConfig. */
export function geminiGenerationControls(model: string, legacyTemperature: number) {
  return model.includes("2.5") || model === "gemini-3.1-flash-lite"
    ? { temperature: legacyTemperature }
    : { thinkingConfig: { thinkingLevel: "LOW" as ThinkingLevel } };
}

export interface CreateGenAIClientOptions {
  apiKey?: string;
  vertexai?: boolean;
  project?: string;
  location?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export function createGenAIClient(options: CreateGenAIClientOptions): GoogleGenAI {
  const vertexActive = options.vertexai ?? isVertexAiActive();
  if (vertexActive) {
    const vConfig = getVertexAiConfig();
    return new GoogleGenAI({
      vertexai: true,
      project: options.project || vConfig.project,
      location: options.location || vConfig.location,
      httpOptions: {
        timeout: options.timeoutMs ?? GEMINI_SDK_TIMEOUT_MS,
        retryOptions: { attempts: 1, initialDelay: 0.5, maxDelay: 2.0, expBase: 2.0 },
        headers: options.headers ?? { "User-Agent": "aistudio-build" },
      },
    });
  }

  return new GoogleGenAI({
    apiKey: options.apiKey,
    httpOptions: {
      timeout: options.timeoutMs ?? GEMINI_SDK_TIMEOUT_MS,
      retryOptions: { attempts: 1, initialDelay: 0.5, maxDelay: 2.0, expBase: 2.0 },
      headers: options.headers ?? { "User-Agent": "aistudio-build" },
    },
  });
}
