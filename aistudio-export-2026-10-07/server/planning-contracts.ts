import type {
  ExceptionPlan, ExpenseFacts, PolicyDecision, ReviewRecord, VersionBinding,
} from "../src/domain/contracts.ts";
import type { PROMPT_VERSIONS } from "./runtime-config.ts";

export interface TokenUsage {
  prompt_tokens: number | null;
  candidate_tokens: number | null;
  thoughts_tokens: number | null;
  total_tokens: number | null;
}

export interface PlanningStep {
  role: "FACTS" | "PLANNER" | "REVIEWER";
  attempt: number;
  outcome: "SUCCESS" | "ERROR";
  duration_ms: number;
  requested_model_id: string;
  model_id: string;
  upstream_status: number | null;
  token_usage: TokenUsage | null;
  error_code: string | null;
}

export interface PlanningReviewResult {
  stage: "S2";
  status: "REVIEWABLE" | "NEEDS_INFO" | "BLOCKED" | "NO_ACTION_REQUIRED";
  decision: PolicyDecision;
  plan: ExceptionPlan | null;
  review: ReviewRecord | null;
  planner_rationale: string | null;
  execution_authorized: false;
  binding: VersionBinding;
  steps: PlanningStep[];
  prompt_versions?: typeof PROMPT_VERSIONS;
}

export interface WorkflowResponse {
  ok: boolean;
  run_id: string;
  timestamp: string;
  requested_model_id: string;
  model_id: string;
  http_status: number;
  upstream_status: number | null;
  facts: ExpenseFacts | null;
  workflow: PlanningReviewResult | null;
  steps?: PlanningStep[];
  prompt_versions?: typeof PROMPT_VERSIONS;
  token_usage?: TokenUsage | null;
  submitted_input?: {
    synthetic_only: true;
    description: string | null;
    amount_usd: number | null;
    amount_minor_input: number | null;
    receipt_status: ExpenseFacts["receipt_status"];
    employee_identifier: string | null;
  };
  error?: { code: string; message: string };
}

export interface PlanningGenerateContentArgs {
  role: "PLANNER" | "REVIEWER";
  apiKey: string;
  model: string;
  promptPayload: string;
  systemInstruction: string;
  responseJsonSchema: unknown;
  abortSignal: AbortSignal;
  timeoutMs: number;
}

export interface PlanningGenerateContentResult {
  text: string | undefined;
  modelVersion?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    totalTokenCount?: number;
  };
}

export type PlanningGenerateContentFn = (args: PlanningGenerateContentArgs) => Promise<PlanningGenerateContentResult>;
