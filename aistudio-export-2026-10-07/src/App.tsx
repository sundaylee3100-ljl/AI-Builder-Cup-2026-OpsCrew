/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  FileWarning,
  Info,
  Loader2,
  Play,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

type ReceiptStatus = "available" | "missing" | "unknown";

interface ValidatedExpenseFacts {
  amount_minor: number | null;
  currency: "USD";
  receipt_status: ReceiptStatus;
  description: string | null;
  employee_identifier: string | null;
  missing_information: string[];
  contradictions: string[];
}

interface TokenUsage {
  prompt_tokens: number | null;
  candidate_tokens: number | null;
  thoughts_tokens: number | null;
  total_tokens: number | null;
}

interface AnalyzeSuccessResponse {
  ok: true;
  run_id: string;
  timestamp: string;
  requested_model_id: string;
  model_id: string;
  http_status?: number;
  upstream_status?: number | null;
  token_usage: TokenUsage | null;
  submitted_input: {
    synthetic_only: boolean;
    description: string | null;
    amount_usd: number | null;
    amount_minor_input: number | null;
    receipt_status: ReceiptStatus;
    employee_identifier: string | null;
  };
  facts: ValidatedExpenseFacts;
}

interface AnalyzeErrorResponse {
  ok: false;
  run_id: string;
  timestamp: string;
  requested_model_id: string;
  model_id: string;
  http_status?: number;
  upstream_status?: number | null;
  error: {
    code: string;
    message: string;
  };
}

interface SyntheticPreset {
  id: string;
  label: string;
  summary: string;
  description: string;
  amountUsd: string;
  receiptStatus: ReceiptStatus;
  employeeIdentifier: string;
}

const SYNTHETIC_PRESETS: SyntheticPreset[] = [
  {
    id: "contradiction-amount-receipt",
    label: "Synthetic 01: Amount & Receipt Conflict",
    summary:
      "Form enters $148.50 and 'available', while narrative states $184.50 and lost paper receipt.",
    description:
      "[SYNTHETIC] Team working dinner in Chicago with 4 client implementation engineers on Oct 4. Total charged to corporate card was $184.50, but the itemized paper receipt was lost at the restaurant.",
    amountUsd: "148.50",
    receiptStatus: "available",
    employeeIdentifier: "SYNTH-EMP-1042",
  },
  {
    id: "missing-employee-unknown-receipt",
    label: "Synthetic 02: Unknown Receipt & Null Employee ID",
    summary:
      "Omits employee identifier and uses 'unknown' receipt status to verify null/unknown preservation.",
    description:
      "[SYNTHETIC] Late-night airport rideshare from SFO Terminal 2 to downtown hotel after flight cancellation ($64.25 USD). Unsure if the rideshare app emailed a valid tax receipt yet.",
    amountUsd: "64.25",
    receiptStatus: "unknown",
    employeeIdentifier: "",
  },
  {
    id: "employee-id-conflict",
    label: "Synthetic 03: Employee Identifier Mismatch",
    summary:
      "Form specifies SYNTH-EMP-2015, but narrative states expense was incurred by SYNTH-EMP-9981.",
    description:
      "[SYNTHETIC] Emergency replacement USB-C display adapter purchased by employee SYNTH-EMP-9981 prior to customer keynote for $42.00 USD. Store register was out of receipt paper.",
    amountUsd: "42.00",
    receiptStatus: "missing",
    employeeIdentifier: "SYNTH-EMP-2015",
  },
  {
    id: "clean-exception",
    label: "Synthetic 04: Aligned Missing-Receipt Exception",
    summary: "Consistent form fields and narrative with faded thermal receipt.",
    description:
      "[SYNTHETIC] Out-of-pocket municipal garage parking fee in Seattle during Q4 architecture workshop on Oct 2 ($38.00 USD). Thermal paper receipt faded and is unreadable.",
    amountUsd: "38.00",
    receiptStatus: "missing",
    employeeIdentifier: "SYNTH-EMP-3310",
  },
];

const DEFAULT_ALLOWED_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

// Bounded UI waiting timeout in milliseconds
const CLIENT_WAIT_TIMEOUT_MS = 28_000;

function computePreviewMinorUnits(rawUsd: string): number | "invalid" | null {
  const trimmed = rawUsd.trim();
  if (!trimmed) return null;
  if (/^[+-]/.test(trimmed)) return "invalid";
  const withoutDollar = trimmed.replace(/^\$\s*/, "");
  if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/.test(withoutDollar)) {
    return "invalid";
  }
  const normalized = withoutDollar.replace(/,/g, "");
  const [wholeStr, fracStr = ""] = normalized.split(".");
  const paddedFrac = (fracStr + "00").slice(0, 2);
  const whole = Number(wholeStr);
  const cents = Number(paddedFrac);
  if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(cents)) {
    return "invalid";
  }
  const totalMinor = whole * 100 + cents;
  if (!Number.isSafeInteger(totalMinor) || totalMinor < 0) {
    return "invalid";
  }
  return totalMinor;
}

export default function App() {
  const [activePresetId, setActivePresetId] = useState<string>(SYNTHETIC_PRESETS[0].id);
  const [description, setDescription] = useState<string>(SYNTHETIC_PRESETS[0].description);
  const [amountUsd, setAmountUsd] = useState<string>(SYNTHETIC_PRESETS[0].amountUsd);
  const [receiptStatus, setReceiptStatus] = useState<ReceiptStatus>(
    SYNTHETIC_PRESETS[0].receiptStatus
  );
  const [employeeIdentifier, setEmployeeIdentifier] = useState<string>(
    SYNTHETIC_PRESETS[0].employeeIdentifier
  );

  // Server-allowlisted Gemini models only (no arbitrary custom model input)
  const [allowedModels, setAllowedModels] = useState<string[]>(DEFAULT_ALLOWED_MODELS);
  const [modelId, setModelId] = useState<string>("gemini-3.1-flash-lite");
  const [configuredModel, setConfiguredModel] = useState<string | null>(null);
  const [serverTimeoutMs, setServerTimeoutMs] = useState<number>(25_000);

  // Execution state with bounded waiting timer
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [result, setResult] = useState<AnalyzeSuccessResponse | null>(null);
  const [errorResponse, setErrorResponse] = useState<AnalyzeErrorResponse | null>(null);
  const [jsonViewMode, setJsonViewMode] = useState<"facts" | "envelope">("facts");
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  const activeAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/config", {
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        const contentType = res.headers.get("content-type") || "";
        if (!res.ok || !contentType.toLowerCase().includes("application/json")) {
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        if (Array.isArray(data.allowed_models) && data.allowed_models.length > 0) {
          const validModels = data.allowed_models.filter(
            (m: unknown): m is string => typeof m === "string" && m.trim().length > 0
          );
          if (validModels.length > 0) {
            setAllowedModels(validModels);
          }
        }
        if (typeof data.default_model === "string" && data.default_model.trim()) {
          const configuredDefault = data.default_model.trim();
          setModelId(configuredDefault);
          setConfiguredModel(configuredDefault);
        }
        if (typeof data.route_timeout_ms === "number" && data.route_timeout_ms > 0) {
          setServerTimeoutMs(data.route_timeout_ms);
        }
      })
      .catch(() => {
        // Keep default allowlist if config fetch fails
      });
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setElapsedSeconds(0);
      return;
    }
    const startedAt = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSelectPreset = (preset: SyntheticPreset) => {
    setActivePresetId(preset.id);
    setDescription(preset.description);
    setAmountUsd(preset.amountUsd);
    setReceiptStatus(preset.receiptStatus);
    setEmployeeIdentifier(preset.employeeIdentifier);
  };

  const handleResetBlank = () => {
    setActivePresetId("");
    setDescription("");
    setAmountUsd("");
    setReceiptStatus("unknown");
    setEmployeeIdentifier("");
    setResult(null);
    setErrorResponse(null);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
    }

    const controller = new AbortController();
    activeAbortRef.current = controller;
    const clientTimeoutHandle = setTimeout(() => {
      controller.abort(
        new DOMException(
          `Client waiting state exceeded bounded limit of ${Math.round(CLIENT_WAIT_TIMEOUT_MS / 1000)}s.`,
          "TimeoutError"
        )
      );
    }, CLIENT_WAIT_TIMEOUT_MS);

    setIsLoading(true);
    setErrorResponse(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          description,
          amount_usd: amountUsd,
          receipt_status: receiptStatus,
          employee_identifier: employeeIdentifier.trim() || null,
          model_id: modelId,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        const rawBody = await response.text();
        const snippet = rawBody.replace(/\s+/g, " ").trim().slice(0, 120);
        setErrorResponse({
          ok: false,
          run_id: "run_non_json_response",
          timestamp: new Date().toISOString(),
          requested_model_id: modelId,
          model_id: modelId,
          http_status: response.status,
          upstream_status: response.status,
          error: {
            code: `NON_JSON_HTTP_${response.status}`,
            message: `Expected application/json from /api/analyze but received '${contentType || "unknown"}' (HTTP ${response.status}). Body preview: ${snippet || "(empty)"}. No mock result was generated.`,
          },
        });
        return;
      }

      const payload = await response.json();
      const realHttpStatus =
        typeof payload?.http_status === "number" ? payload.http_status : response.status;
      const upstreamStatus =
        typeof payload?.upstream_status === "number" ? payload.upstream_status : null;

      if (!response.ok || !payload.ok) {
        setErrorResponse(
          payload && payload.error
            ? {
                ...(payload as AnalyzeErrorResponse),
                http_status: realHttpStatus,
                upstream_status: upstreamStatus,
              }
            : {
                ok: false,
                run_id: payload?.run_id || "run_client_unparsed",
                timestamp: new Date().toISOString(),
                requested_model_id: modelId,
                model_id: modelId,
                http_status: realHttpStatus,
                upstream_status: upstreamStatus,
                error: {
                  code: `HTTP_${realHttpStatus}`,
                  message:
                    payload?.message ||
                    `Server returned status ${realHttpStatus}. No mock result was generated.`,
                },
              }
        );
      } else {
        setResult({
          ...(payload as AnalyzeSuccessResponse),
          http_status: realHttpStatus,
          upstream_status: upstreamStatus,
        });
      }
    } catch (err: unknown) {
      const isTimeout =
        (err instanceof Error &&
          (err.name === "TimeoutError" ||
            err.name === "AbortError" ||
            /timeout|timed out|aborted/i.test(err.message))) ||
        controller.signal.aborted;

      const msg =
        err instanceof Error ? err.message : "Network error communicating with backend.";
      setErrorResponse({
        ok: false,
        run_id: isTimeout ? "run_client_timeout" : "run_network_error",
        timestamp: new Date().toISOString(),
        requested_model_id: modelId,
        model_id: modelId,
        http_status: isTimeout ? 504 : undefined,
        upstream_status: isTimeout ? 504 : null,
        error: {
          code: isTimeout ? "CLIENT_WAIT_TIMEOUT" : "NETWORK_ERROR",
          message: `${msg} No mock result was generated.`,
        },
      });
    } finally {
      clearTimeout(clientTimeoutHandle);
      if (activeAbortRef.current === controller) {
        activeAbortRef.current = null;
      }
      setIsLoading(false);
    }
  };

  const handleCopyJson = async () => {
    if (!result) return;
    const textToCopy = JSON.stringify(
      jsonViewMode === "facts" ? result.facts : result,
      null,
      2
    );
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 1800);
    } catch {
      // Ignore clipboard failures in restricted iframes
    }
  };

  const previewMinorUnits = computePreviewMinorUnits(amountUsd);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: Zone 1 Brand | Zone 2 Nav Links | Zone 3 Primary Action */}
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-[1360px] mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <a
            href="#main-workspace"
            className="text-lg font-bold tracking-tight text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
          >
            OpsCrew
          </a>

          <nav
            aria-label="Workspace sections"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
          >
            <a
              href="#intake-panel"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Intake Form
            </a>
            <a
              href="#synthetic-presets"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Synthetic Cases
            </a>
            <a
              href="#results-panel"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Structured Output
            </a>
            <a
              href="#scope-guardrails"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Scope &amp; Guardrails
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSelectPreset(SYNTHETIC_PRESETS[0])}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-600 rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              Load Default Synthetic Case
            </button>
          </div>
        </div>
      </header>

      {/* Mandatory Prototype & Synthetic Data Notice Bar */}
      <div
        role="region"
        aria-label="Prototype scope and synthetic data notice"
        className="bg-teal-950 text-teal-50 border-b border-teal-900 px-6 py-2.5"
      >
        <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-y-1 gap-x-6 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
            <span>Prototype: no reimbursement approval or payment</span>
            <span aria-hidden="true" className="text-teal-500">
              ·
            </span>
            <span className="text-teal-200">
              Synthetic data only — do not submit real employee PII or live financial records
            </span>
          </div>
          <div className="text-teal-300 font-mono">
            AI Builder Cup 2026 · Future of Work &amp; Enterprise Productivity
          </div>
        </div>
      </div>

      {/* Main Two-Panel Workspace */}
      <main
        id="main-workspace"
        className="flex-1 max-w-[1360px] w-full mx-auto px-6 py-8"
      >
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Expense-Exception Intake &amp; Discrepancy Extractor
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-3xl">
            Extracts strictly validated structured facts (
            <code className="text-xs font-mono text-slate-800">amount_minor</code>,{" "}
            <code className="text-xs font-mono text-slate-800">currency</code>,{" "}
            <code className="text-xs font-mono text-slate-800">receipt_status</code>,{" "}
            <code className="text-xs font-mono text-slate-800">description</code>,{" "}
            <code className="text-xs font-mono text-slate-800">employee_identifier</code>,{" "}
            <code className="text-xs font-mono text-slate-800">missing_information</code>, and{" "}
            <code className="text-xs font-mono text-slate-800">contradictions</code>) via
            server-side Gemini API without resolving form-vs-narrative conflicts silently.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT PANEL: Input Form & Synthetic Scenarios (5 cols on desktop) */}
          <section
            id="intake-panel"
            aria-labelledby="intake-heading"
            className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6"
          >
            <div className="flex items-baseline justify-between pb-4 mb-5 border-b border-slate-200">
              <div>
                <h2 id="intake-heading" className="text-base font-semibold text-slate-900">
                  1. Synthetic Exception Intake
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  All inputs are labeled synthetic for prototype evaluation.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetBlank}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded px-2 py-1 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Clear Form
              </button>
            </div>

            {/* Synthetic Test Presets */}
            <div id="synthetic-presets" className="mb-6">
              <span className="block text-xs font-semibold text-slate-700 mb-2">
                Load Synthetic Test Scenario
              </span>
              <div className="grid grid-cols-1 gap-2">
                {SYNTHETIC_PRESETS.map((preset) => {
                  const isSelected = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`text-left p-2.5 rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                        isSelected
                          ? "bg-teal-50/70 border-teal-700 text-slate-900"
                          : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900">
                          {preset.label}
                        </span>
                        <span className="text-xs font-mono text-teal-800 tabular-nums shrink-0">
                          ${preset.amountUsd} · {preset.receiptStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {preset.summary}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleAnalyze} noValidate className="space-y-5">
              {/* Expense Description */}
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label
                    htmlFor="expense-description"
                    className="block text-sm font-medium text-slate-900"
                  >
                    Expense Description (Synthetic Narrative)
                  </label>
                  <span className="text-xs text-slate-500">Required</span>
                </div>
                <textarea
                  id="expense-description"
                  name="description"
                  rows={4}
                  value={description}
                  onChange={(e) => {
                    setActivePresetId("");
                    setDescription(e.target.value);
                  }}
                  placeholder="[SYNTHETIC] Describe the expense circumstances, vendor, amount, and why an exception is needed..."
                  aria-describedby="description-help"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
                <p id="description-help" className="mt-1 text-xs text-slate-500">
                  If the narrative contradicts form fields below, OpsCrew preserves both in{" "}
                  <code className="font-mono text-slate-700">contradictions</code>.
                </p>
              </div>

              {/* Amount in USD */}
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label
                    htmlFor="expense-amount-usd"
                    className="block text-sm font-medium text-slate-900"
                  >
                    Amount in USD
                  </label>
                  <span className="text-xs font-mono text-slate-500 tabular-nums">
                    {previewMinorUnits === null
                      ? "amount_minor: null"
                      : previewMinorUnits === "invalid"
                      ? "Invalid USD format"
                      : `amount_minor: ${previewMinorUnits} (cents)`}
                  </span>
                </div>
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-mono text-slate-500"
                  >
                    $
                  </span>
                  <input
                    id="expense-amount-usd"
                    name="amount_usd"
                    type="text"
                    inputMode="decimal"
                    value={amountUsd}
                    onChange={(e) => {
                      setActivePresetId("");
                      setAmountUsd(e.target.value);
                    }}
                    placeholder="e.g. 148.50 (leave blank if unknown)"
                    aria-describedby="amount-help"
                    className="w-full rounded-md border border-slate-300 bg-white pl-7 pr-14 py-2 text-sm font-mono tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-mono text-slate-500"
                  >
                    USD
                  </span>
                </div>
                <p id="amount-help" className="mt-1 text-xs text-slate-500">
                  Validated as a non-negative safe integer in minor units (1 USD = 100 cents), or{" "}
                  <code className="font-mono text-slate-700">null</code> if unknown.
                </p>
              </div>

              {/* Receipt Status */}
              <fieldset>
                <legend className="block text-sm font-medium text-slate-900 mb-1.5">
                  Receipt Status
                </legend>
                <div
                  role="radiogroup"
                  aria-label="Receipt Status"
                  className="grid grid-cols-3 gap-2.5"
                >
                  {(["available", "missing", "unknown"] as ReceiptStatus[]).map((status) => {
                    const checked = receiptStatus === status;
                    return (
                      <label
                        key={status}
                        htmlFor={`receipt-status-${status}`}
                        className={`cursor-pointer flex items-center justify-center px-3 py-2 rounded-md border text-xs font-medium capitalize transition-colors focus-within:ring-2 focus-within:ring-teal-600 whitespace-nowrap ${
                          checked
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          id={`receipt-status-${status}`}
                          type="radio"
                          name="receipt_status"
                          value={status}
                          checked={checked}
                          onChange={() => {
                            setActivePresetId("");
                            setReceiptStatus(status);
                          }}
                          className="sr-only"
                        />
                        {status}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* Optional Employee Identifier */}
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label
                    htmlFor="employee-identifier"
                    className="block text-sm font-medium text-slate-900"
                  >
                    Employee Identifier
                  </label>
                  <span className="text-xs text-slate-500">Optional (Synthetic)</span>
                </div>
                <input
                  id="employee-identifier"
                  name="employee_identifier"
                  type="text"
                  value={employeeIdentifier}
                  onChange={(e) => {
                    setActivePresetId("");
                    setEmployeeIdentifier(e.target.value);
                  }}
                  placeholder="e.g. SYNTH-EMP-1042 (leave empty for null)"
                  aria-describedby="employee-id-help"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
                <p id="employee-id-help" className="mt-1 text-xs text-slate-500">
                  Must be grounded in the form or narrative; when absent from both,{" "}
                  <code className="font-mono text-slate-700">employee_identifier</code> is enforced
                  as <code className="font-mono text-slate-700">null</code>.
                </p>
              </div>

              {/* Server-Allowlisted Gemini Model Selection */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-baseline justify-between mb-1.5">
                  <label
                    htmlFor="gemini-model-select"
                    className="block text-sm font-medium text-slate-900"
                  >
                    Supported Gemini Model (Server Allowlist)
                  </label>
                  <span className="text-xs font-mono text-slate-500">
                    Timeout: {Math.round(serverTimeoutMs / 1000)}s
                  </span>
                </div>

                <select
                  id="gemini-model-select"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  aria-describedby="model-config-help"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                >
                  {allowedModels.map((m) => (
                    <option key={m} value={m}>
                      {m} {m === configuredModel ? "(Configured Default)" : ""}
                    </option>
                  ))}
                </select>
                <p id="model-config-help" className="mt-1 text-xs text-slate-500">
                  Restricted to the server-side model allowlist via{" "}
                  <code className="font-mono text-slate-700">@google/genai</code>. App code does not
                  know the account billing tier; no billing activation or paid deployment is
                  performed by this prototype.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 hover:bg-teal-600 disabled:bg-slate-400 text-white font-semibold py-2.5 px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-700 whitespace-nowrap"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Analyzing with {modelId} ({elapsedSeconds}s)...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                      Analyze Expense Exception
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* RIGHT PANEL: Strictly Validated Results Panel (7 cols on desktop) */}
          <section
            id="results-panel"
            aria-labelledby="results-heading"
            aria-live="polite"
            className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 mb-5 border-b border-slate-200">
              <div>
                <h2 id="results-heading" className="text-base font-semibold text-slate-900">
                  2. Strictly Validated Intake Facts &amp; Telemetry
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct output from server-side Gemini invocation. Never falls back to mock data.
                </p>
              </div>
              {result && (
                <div className="text-xs text-slate-500 font-mono tabular-nums">
                  Schema: Validated · Currency: {result.facts.currency}
                </div>
              )}
            </div>

            {/* STATE 1: Bounded Loading State */}
            {isLoading && (
              <div
                role="status"
                className="py-16 px-6 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50"
              >
                <Loader2
                  className="w-7 h-7 text-teal-700 animate-spin mx-auto mb-3"
                  aria-hidden="true"
                />
                <p className="text-sm font-semibold text-slate-900">
                  Running Server-Side Gemini Analysis
                </p>
                <p className="text-xs text-slate-600 font-mono tabular-nums mt-1">
                  Model: {modelId} · Elapsed: {elapsedSeconds}s /{" "}
                  {Math.round(serverTimeoutMs / 1000)}s bounded timeout
                </p>
              </div>
            )}

            {/* STATE 2: API / Validation / Timeout Error (No Mock Fallback) */}
            {!isLoading && errorResponse && (
              <div
                role="alert"
                className="border border-red-300 bg-red-50/70 rounded-lg p-5 text-red-950"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className="w-5 h-5 text-red-700 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-red-900">
                      Analysis Failed ({errorResponse.error.code})
                    </h3>
                    <p className="mt-1 text-xs text-red-800 leading-relaxed break-words">
                      {errorResponse.error.message}
                    </p>
                    <div className="mt-3 pt-3 border-t border-red-200 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-red-900 tabular-nums">
                      {errorResponse.http_status !== undefined && (
                        <>
                          <span>http_status: {errorResponse.http_status}</span>
                          <span aria-hidden="true">·</span>
                        </>
                      )}
                      {errorResponse.upstream_status !== undefined &&
                        errorResponse.upstream_status !== null && (
                          <>
                            <span>upstream_status: {errorResponse.upstream_status}</span>
                            <span aria-hidden="true">·</span>
                          </>
                        )}
                      <span>run_id: {errorResponse.run_id}</span>
                      <span aria-hidden="true">·</span>
                      <span>model_id: {errorResponse.model_id}</span>
                      <span aria-hidden="true">·</span>
                      <span>timestamp: {errorResponse.timestamp}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STATE 3: Initial Empty State */}
            {!isLoading && !errorResponse && !result && (
              <div className="py-16 px-6 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/60">
                <FileWarning
                  className="w-7 h-7 text-slate-400 mx-auto mb-3"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-semibold text-slate-800">
                  No Intake Run Executed Yet
                </h3>
                <p className="mt-1 text-xs text-slate-600 max-w-md mx-auto">
                  Select one of the synthetic test scenarios on the left and click{" "}
                  <strong className="font-semibold text-slate-800">
                    Analyze Expense Exception
                  </strong>{" "}
                  to call the server-side Gemini API and inspect the validated output.
                </p>
              </div>
            )}

            {/* STATE 4: Validated Result */}
            {!isLoading && !errorResponse && result && (
              <div className="space-y-6">
                {/* Execution Metadata Bar */}
                <div className="bg-slate-900 text-slate-100 rounded-md px-4 py-3 text-xs font-mono tabular-nums">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span>
                      <span className="text-slate-400">run_id:</span> {result.run_id}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">
                      ·
                    </span>
                    <span>
                      <span className="text-slate-400">model_id:</span>{" "}
                      <span className="text-teal-300 font-semibold">{result.model_id}</span>
                      {result.requested_model_id !== result.model_id && (
                        <span className="text-slate-400">
                          {" "}
                          (requested: {result.requested_model_id})
                        </span>
                      )}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">
                      ·
                    </span>
                    <span>
                      <span className="text-slate-400">tokens:</span>{" "}
                      {result.token_usage ? (
                        <>
                          total={result.token_usage.total_tokens ?? "null"} (prompt=
                          {result.token_usage.prompt_tokens ?? "null"}, output=
                          {result.token_usage.candidate_tokens ?? "null"}
                          {result.token_usage.thoughts_tokens !== null
                            ? `, thoughts=${result.token_usage.thoughts_tokens}`
                            : ""}
                          )
                        </>
                      ) : (
                        "not returned"
                      )}
                    </span>
                  </div>
                </div>

                {/* Structured Facts Table */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 mb-2">
                    Validated Structured Facts
                  </h3>
                  <div className="border border-slate-200 rounded-md overflow-hidden">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                          <th scope="col" className="py-2.5 px-3.5 font-semibold w-48">
                            Field
                          </th>
                          <th scope="col" className="py-2.5 px-3.5 font-semibold">
                            Validated Value
                          </th>
                          <th scope="col" className="py-2.5 px-3.5 font-semibold text-right w-36">
                            Type / Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono text-xs tabular-nums">
                        <tr className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3.5 text-slate-700 font-medium">
                            amount_minor
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-900">
                            {result.facts.amount_minor !== null ? (
                              <>
                                <span className="font-semibold">
                                  {result.facts.amount_minor}
                                </span>{" "}
                                <span className="text-slate-500">
                                  (${(result.facts.amount_minor / 100).toFixed(2)} USD)
                                </span>
                              </>
                            ) : (
                              <span className="text-amber-700">null</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 text-right text-slate-500">
                            {result.facts.amount_minor !== null ? "integer" : "null"}
                          </td>
                        </tr>

                        <tr className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3.5 text-slate-700 font-medium">currency</td>
                          <td className="py-2.5 px-3.5 text-slate-900 font-semibold">
                            {result.facts.currency}
                          </td>
                          <td className="py-2.5 px-3.5 text-right text-slate-500">string (USD)</td>
                        </tr>

                        <tr className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3.5 text-slate-700 font-medium">
                            receipt_status
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-900 font-semibold">
                            {result.facts.receipt_status}
                          </td>
                          <td className="py-2.5 px-3.5 text-right text-slate-500">enum</td>
                        </tr>

                        <tr className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3.5 text-slate-700 font-medium">
                            employee_identifier
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-900">
                            {result.facts.employee_identifier !== null ? (
                              result.facts.employee_identifier
                            ) : (
                              <span className="text-amber-700">null</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 text-right text-slate-500">
                            {result.facts.employee_identifier !== null ? "string" : "null"}
                          </td>
                        </tr>

                        <tr className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3.5 text-slate-700 font-medium align-top">
                            description
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-900 font-sans text-xs leading-relaxed">
                            {result.facts.description !== null ? (
                              result.facts.description
                            ) : (
                              <span className="font-mono text-amber-700">null</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 text-right text-slate-500 align-top">
                            {result.facts.description !== null ? "string" : "null"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Contradictions & Missing Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contradictions Box */}
                  <div
                    className={`rounded-md border p-4 ${
                      result.facts.contradictions.length > 0
                        ? "border-amber-300 bg-amber-50/60"
                        : "border-slate-200 bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-xs font-semibold text-slate-900">
                        Preserved Contradictions
                      </h3>
                      <span className="text-xs font-mono tabular-nums text-slate-600">
                        count: {result.facts.contradictions.length}
                      </span>
                    </div>
                    {result.facts.contradictions.length > 0 ? (
                      <ul className="space-y-2 text-xs text-amber-950 list-disc pl-4">
                        {result.facts.contradictions.map((item, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-600">
                        No inconsistencies detected between form fields and narrative text.
                      </p>
                    )}
                  </div>

                  {/* Missing Information Box */}
                  <div className="rounded-md border border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-xs font-semibold text-slate-900">
                        Missing Information
                      </h3>
                      <span className="text-xs font-mono tabular-nums text-slate-600">
                        count: {result.facts.missing_information.length}
                      </span>
                    </div>
                    {result.facts.missing_information.length > 0 ? (
                      <ul className="space-y-2 text-xs text-slate-800 list-disc pl-4">
                        {result.facts.missing_information.map((item, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-600">
                        No missing required intake fields identified.
                      </p>
                    )}
                  </div>
                </div>

                {/* Readable JSON Output */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold text-slate-700">
                        Readable JSON Result
                      </h3>
                      <div
                        role="group"
                        aria-label="JSON view mode"
                        className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5"
                      >
                        <button
                          type="button"
                          onClick={() => setJsonViewMode("facts")}
                          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                            jsonViewMode === "facts"
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Structured Facts
                        </button>
                        <button
                          type="button"
                          onClick={() => setJsonViewMode("envelope")}
                          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                            jsonViewMode === "envelope"
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Full Run Envelope
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 whitespace-nowrap"
                    >
                      {copiedJson ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
                          Copied JSON
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          Copy JSON
                        </>
                      )}
                    </button>
                  </div>

                  <pre
                    tabIndex={0}
                    aria-label="Formatted JSON output"
                    className="bg-slate-900 text-slate-100 p-4 rounded-md text-xs font-mono leading-relaxed overflow-x-auto max-h-96 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    <code>
                      {JSON.stringify(
                        jsonViewMode === "facts" ? result.facts : result,
                        null,
                        2
                      )}
                    </code>
                  </pre>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Scope & Architectural Guardrails Section */}
        <section
          id="scope-guardrails"
          aria-labelledby="guardrails-heading"
          className="mt-10 pt-8 border-t border-slate-200"
        >
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-teal-700" aria-hidden="true" />
            <h2 id="guardrails-heading" className="text-sm font-semibold text-slate-900">
              Prototype Guardrails &amp; Verification Scope
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 leading-relaxed">
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">
                1. Server-Side Secret &amp; Allowlist Policy
              </h3>
              <p>
                Calls <code className="font-mono text-slate-800">@google/genai</code> solely from
                the Node.js backend using{" "}
                <code className="font-mono text-slate-800">process.env.GEMINI_API_KEY</code> and a
                strict server-side model allowlist. App code does not know the account billing tier;
                no billing activation or paid deployment is performed by this prototype.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">
                2. Grounding &amp; Discrepancy Preservation
              </h3>
              <p>
                Unknown values remain <code className="font-mono text-slate-800">null</code> or{" "}
                <code className="font-mono text-slate-800">&quot;unknown&quot;</code>.{" "}
                <code className="font-mono text-slate-800">employee_identifier</code> must be
                grounded in the form or narrative. Explicit form-vs-narrative conflicts identify
                both sources in <code className="font-mono text-slate-800">contradictions</code>.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">
                3. Bounded Timeouts &amp; Non-Fabrication
              </h3>
              <p>
                Prototype: no reimbursement approval or payment. Requests use bounded SDK timeouts
                and finite retries. API, timeout, or schema validation errors fail transparently
                with no mock fallback.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto py-4 px-6">
        <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>OpsCrew · AI Builder Cup 2026 (Future of Work &amp; Enterprise Productivity)</span>
          <span>Prototype: no reimbursement approval or payment · Synthetic data only</span>
        </div>
      </footer>
    </div>
  );
}
