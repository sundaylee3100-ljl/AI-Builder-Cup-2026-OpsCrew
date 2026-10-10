# S2: AI planning and separate review

S2 extends the Google AI Studio Build baseline with two separately prompted Gemini calls after trusted fact extraction. The Planner proposes a policy outcome and, when eligible, a synthetic exception case. A fresh Reviewer call checks that recommendation. Deterministic validation retains final authority over facts, branches, actions, and citations.

The two roles may use the same allowlisted Gemini model. They are separate calls and contexts, not independent models or proof of independent reasoning. A passing review is a recommendation only. S2 has no authenticated ownership, human approval, database write, payment action, or cloud deployment.

## Request and result

The web server accepts intake data, performs the existing strict extraction and deterministic conflict preservation, then calls [`runPlanningReview`](../aistudio-export-2026-10-07/server/planning-service.ts). It does not accept client-supplied plans, facts snapshots, owner IDs, review records, or approvals as authority.

The shared browser response types are defined in [`planning-contracts.ts`](../aistudio-export-2026-10-07/server/planning-contracts.ts). The `workflow` result includes:

| Field | Meaning |
| --- | --- |
| `stage` | Always `S2`. |
| `status` | Pipeline outcome: `REVIEWABLE`, `NEEDS_INFO`, `BLOCKED`, or `NO_ACTION_REQUIRED`. |
| `decision` | Original deterministic policy decision, including blockers and required information. |
| `plan` | Validated `ExceptionPlan` for an eligible case; otherwise `null`. |
| `review` | Separately generated and validated `ReviewRecord`; `null` when the pipeline fails. |
| `planner_rationale` | Short Planner explanation, not a hidden reasoning trace or execution receipt. |
| `execution_authorized` | Always `false`. |
| `binding` | Service-generated run/input/facts/policy/plan identifiers and versions. |
| `steps` | Actual attempted model calls, including failed retries. |
| `prompt_versions` | Service-owned versions for the fact extractor, Planner, and Reviewer instructions. |

`owner_id: "local-preview"` identifies this local development context. It does not establish a user identity or permission. The service generates `plan_id`, `review_id`, and `reviewed_at`; model-supplied versions, authority fields, or timestamps are rejected. An input edit starts a new run; S3 must replace this placeholder with verified ownership and durable version control.

The frozen prompt version labels are `opscrew-facts-1.1.0`, `opscrew-planner-1.0.1`, and `opscrew-reviewer-1.0.0`. Runtime workflow results include them, and the HTTP integration also returns the same object at the top level. The type fields are optional for compatibility with historical UI fixtures; new runtime results always include them. These labels identify the instructions used for later regression comparisons. The original metadata addition did not change prompt text; Planner 1.0.1 later clarified authoritative branch/action/citation preservation and conflict precedence. The original four failed live calls returning `402` were recorded before this metadata addition; their report remains unchanged and does not establish successful Planner or Reviewer execution.

The pipeline status and policy branch are intentionally separate. For example, a valid deterministic `MANUAL_REVIEW` decision followed by a provider timeout returns a partial result with `status: "BLOCKED"`, that same decision, and no plan or review. No successful workflow, committed case, or fallback is fabricated.

## Planner contract and deterministic veto

The bounded JSON Planner response contains exactly `branch`, `action`, `proposed_case`, `citation_ids`, and `rationale`.

- All five policy branches run the Planner and, if the Planner passes deterministic checks, the Reviewer.
- `EVIDENCE_REQUEST` and `MANUAL_REVIEW` may propose only `create_exception_case`.
- `NEEDS_INFO`, `BLOCKED`, and `NO_ACTION_REQUIRED` must return `action: null` and `proposed_case: null`.
- The case must preserve validated amount, currency, receipt status, employee identifier, and description exactly, including the required evidence request.
- Citation IDs must be unique and match the exact supporting clause set for the current deterministic branch. Missing, fabricated, stale, irrelevant, duplicate, or altered IDs fail closed.
- After validating every ID, the service resolves canonical policy version and original text from the frozen policy. The model cannot supply or rewrite a quote.
- Extra fields, payment actions, authority claims in structured fields, invalid JSON, empty responses, and oversized output are rejected.

An invalid Planner response stops the pipeline before the Reviewer is called. Its step records a validation error with upstream status `200` and any actual token usage, distinguishing a returned but unsafe response from a transport failure.

Instructions embedded in expense descriptions, missing-information notes, or contradiction text are untrusted data. Both role prompts state this boundary, and structured validation prevents them from changing policy or authorizing actions.

## Reviewer contract

The Reviewer response contains exactly `verdict`, `issues`, and `citation_ids`. `PASS` requires no unresolved issues. `NEEDS_INFO` and `BLOCKED` require at least one concrete issue. The same strict citation support check applies.

A valid Reviewer `PASS` preserves the deterministic outcome. It cannot make an incomplete or conflicting case eligible. A non-passing review can restrict an otherwise reviewable or no-action recommendation; it cannot clear a deterministic blocker. The browser must use the pipeline status when displaying reviewability and continue showing `execution_authorized: false`.

A schema or citation failure in the Reviewer clears the plan and review from the error result. A valid non-passing review may display its checked recommendation for explanation, but its status remains non-reviewable and it grants no approval.

## Bounds, retries, and telemetry

| Control | S2 implementation |
| --- | --- |
| Planner + Reviewer deadline | At most 60 seconds, also bounded by the incoming cancellation signal. |
| Each model attempt | At most 20 seconds. |
| SDK internal retries | Disabled with `retryOptions.attempts: 1`. |
| Caller-owned retries | At most two attempts per role; retry only HTTP `429` or `503`. |
| Delay | At most 250 ms between those attempts. |
| Output | JSON schema, 2,048 output-token cap, 16,384-byte response cap. |
| Explanations/issues | Bounded strings and arrays, checked again by the service. |
| Cancellation | Interrupts a waiting call; late provider completion cannot create a successful result. |
| Failure messages | Fixed public messages; raw provider messages and the key are not returned. |

Each step reports its role (`FACTS`, `PLANNER`, or `REVIEWER`), attempt, success/error outcome, elapsed milliseconds, requested and returned model IDs, upstream status, token usage if supplied, and a safe error code. The planning service records Planner/Reviewer attempts; the HTTP integration adds fact-extraction attempts. Missing usage is `null`, not an invented zero or cost estimate. No application log prints the API key or raw provider response.

The service's timeout and delay overrides are internal test/service injection points. They are clamped to these maxima and are not accepted from an HTTP request.

## Verification

The formal test file is [`planning-service.test.ts`](../aistudio-export-2026-10-07/tests/planning-service.test.ts). From the application directory:

```powershell
npx tsx --test tests/planning-service.test.ts
npm run lint
```

On October 10, 2026, these **61 offline service tests passed**. They cover all 12 public development fixtures, fact and action mutations, exact citations, unsupported fields and injection, Reviewer verdict validity, no-action restrictions, bounded retry telemetry, provider failures, safe public errors, malformed and oversized JSON, timeouts, cancellation, and pre-call key/model checks. Native Node 24 import compatibility is also checked during integration.

These tests use an injected provider and make no real Gemini calls. The provider doubles return declared fixture proposals so the tests verify service gates and failure behavior; they do not measure Gemini quality. Real-key acceptance is recorded separately by the live acceptance runner and stage acceptance report. The 12 public examples remain development cases, not the eight sealed S5 evaluation cases.

See [S2 acceptance](acceptance/S02-plan-and-review.md) for the final 104-test suite, observed real browser integration, preserved failed/live evidence and unresolved no-action/conflict timeouts. Cloud deployment is deferred at the user's instruction; no cloud resource is necessary to verify this local S2 workflow.

## Official implementation references

Google documents JSON-schema structured output and server-side validation of results in its [structured output guide](https://ai.google.dev/gemini-api/docs/structured-output). The SDK's [HTTP retry options](https://googleapis.github.io/js-genai/release_docs/interfaces/types.HttpRetryOptions.html) define `attempts` as including the original request; one disables SDK retries. The locally installed SDK types also confirm `responseJsonSchema`, abort signals, timeout, and retry configuration. These references were checked on October 9, 2026.

## S3 boundary

S3 must add verified Google identity, durable snapshots, human confirmation bound to the current input/plan, transactional case creation, uniqueness, and committed-result readback. It must recheck deterministic eligibility and current versions in the trusted write path. An S2 response alone cannot satisfy those requirements, approve reimbursement, or prove that any case was created.
