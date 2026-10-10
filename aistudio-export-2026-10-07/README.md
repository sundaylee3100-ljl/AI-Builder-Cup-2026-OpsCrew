# OpsCrew — Expense Exception Plan & Review

**AI Builder Cup 2026 · Theme: Future of Work & Enterprise Productivity**

S2 local continuation (2026-10-09–10): use Node.js 24 and the [repository-root README](../README.md) for current setup, policy/contracts, acceptance and deployment preparation. This directory started as a Google Build export; subsequent local edits are disclosed in [provenance](../PROVENANCE.md). Local tests pass, but G2 local functional acceptance passed through strict revalidation of four genuine live branches; earlier timeouts remain reliability limits. Cloud deployment is deferred.

> **Notice:** Prototype: no reimbursement approval or payment. Use **synthetic data only**.

## Overview & Limited Scope

**OpsCrew** is a synthetic expense-exception planning and review prototype built with a React + TypeScript frontend and a Node.js + Express backend.

### What This Prototype Does
- Provides an accessible, keyboard-friendly intake form for **synthetic** expense exceptions:
  - **Expense Description** (narrative text)
  - **Amount in USD** (validated into non-negative safe integer minor units / cents)
  - **Receipt Status** (`available`, `missing`, `unknown`)
  - **Employee Identifier** (optional)
- Calls the Gemini API exclusively from the Node.js server using the official `@google/genai` SDK with bounded request timeouts and cancellation. Hidden SDK retries are disabled; at most two recorded caller attempts per role retry only 429/503.
- Enforces strict contract validation on every structured output field:
  - `amount_minor` (`integer | null`, non-negative safe integer in USD cents)
  - `currency` (`"USD"`)
  - `receipt_status` (`"available" | "missing" | "unknown"`)
  - `description` (`string | null`)
  - `employee_identifier` (`string | null`, strictly grounded in the supplied form or narrative)
  - `missing_information` (`string[]`, rejecting non-string or empty members)
  - `contradictions` (`string[]`, rejecting non-string or empty members)
- Rejects missing contract keys or `undefined` in place of required `null` fields.
- Preserves unknown facts as `null` or `"unknown"` rather than guessing.
- Preserves explicit inconsistencies between structured form fields and narrative text in `contradictions` (identifying both the form and narrative sources) instead of silently choosing a winner.
- Displays execution transparency metadata: actual model ID (`model_id`), server-generated `run_id`, HTTP and upstream status codes, token usage (`prompt_tokens`, `candidate_tokens`, `thoughts_tokens`, `total_tokens`), bounded loading/error states, and a formatted JSON payload. Never fabricates model responses or falls back to mock data on API errors.
- After validated facts, calls a Planner and a fresh Reviewer. Fixed server rules check all five policy branches, exact proposed facts, evidence requirements and citation support; the UI resolves original policy text and version.
- Shows version bindings, review issues and actual step attempts. Editing input cancels and invalidates older results; manual cancellation and retry are available.
- Returns `execution_authorized: false` for every recommendation. The `local-preview` owner is a development placeholder, not verified identity.

### Out of Scope (Not Included in v1)
- **No reimbursement approval or payment execution**
- **No database or persistent storage**
- **No email notifications or external webhook actions**
- **No billing activation or paid deployment performed by this prototype**

---

## Server-Side API Key, Model Allowlist & Billing Notice

1. **Private Key Isolation:**
   - The backend reads `process.env.GEMINI_API_KEY` on the server only.
   - The key is never bundled into client assets, exposed in browser network payloads, placed in prompts, written to logs, or committed to source control.
   - In Google AI Studio, `GEMINI_API_KEY` is injected automatically at runtime via the platform's **Secrets** panel.

2. **Server-Side Model Allowlist & Billing Scope:**
   - The server enforces a strict allowlist of models (`gemini-3.8-flash`, `gemini-3.1-flash-lite`, `gemini-flash-latest`), defaulting to `gemini-3.1-flash-lite`. Arbitrary custom model IDs are rejected. Allowlisting does not verify availability or the account billing tier.
   - Application code does not know the attached account's billing tier and does not guarantee free runtime or zero cloud cost. However, no billing activation, automatic paid model switching, or paid deployment is performed by this prototype.

---

## Running Locally & Offline Tests

```bash
npm ci
npm test
npm run lint
npm run build
npm run smoke:production
npm run dev
```

The local server binds loopback on port `3000`, serving `/api/analyze` (facts only), `/api/workflow` (facts → plan → review), `/api/config` and `/api/health` alongside the Vite frontend. Production binds `0.0.0.0`.

See [S2 acceptance](../docs/acceptance/S02-plan-and-review.md) for the 105 offline checks, eight isolated production checks, local browser evidence and unsuccessful real API attempt. These are separate evidence categories.

---

## Later Cloud Run Deployment

When ready to deploy a container to Google Cloud Run in a future phase:

1. **Build the frontend bundle:**
   ```bash
   npm run build
   ```
2. **Start the production server:**
   ```bash
   NODE_ENV=production npm start
   ```
3. **Cloud Run Environment Variables / Secret Manager:**
   - Mount `GEMINI_API_KEY` via Google Cloud Secret Manager or Cloud Run runtime environment variables.
   - Set `GEMINI_MODEL=gemini-3.1-flash-lite`; Cloud Run injects `PORT`, and the server binds `0.0.0.0`.
   - Do not bake secrets into the container image or `Dockerfile`.
