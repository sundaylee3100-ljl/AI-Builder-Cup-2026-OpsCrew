// Shared runtime configuration. No credential values are exported to the client.
export const PORT = Number(process.env.PORT) || 3000;

export const ALLOWED_GEMINI_MODELS: readonly string[] = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

export const DEFAULT_GEMINI_MODEL = (() => {
  const configured = (process.env.GEMINI_MODEL || "").trim();
  return configured && ALLOWED_GEMINI_MODELS.includes(configured)
    ? configured
    : "gemini-3.1-flash-lite";
})();

export const GEMINI_SDK_TIMEOUT_MS = 25_000;
export const GEMINI_MAX_ATTEMPTS = 2;
export const ROUTE_ABORT_TIMEOUT_MS = 30_000;
export const WORKFLOW_ABORT_TIMEOUT_MS = 90_000;
export const PLANNING_CALL_TIMEOUT_MS = 30_000;
export const PLANNING_TOTAL_TIMEOUT_MS = 60_000;
export const PROMPT_VERSIONS = Object.freeze({
  facts: "opscrew-facts-1.1.0",
  planner: "opscrew-planner-1.0.1",
  reviewer: "opscrew-reviewer-1.0.0",
});
