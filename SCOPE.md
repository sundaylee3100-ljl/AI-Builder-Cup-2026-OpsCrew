# OpsCrew delivery scope

Updated: 2026-10-10 (Asia/Shanghai). S0/S1 local preparation and S2 local planning/review are implemented. Full external gates are pending; S2 real-model acceptance is partial and unresolved for no-action/conflict timeouts, and cloud deployment is deferred by instruction. This document describes the complete target workflow; authentication, confirmation and persisted case creation are still future work. See the [workboard](docs/DELIVERY_WORKBOARD.md), [S2 acceptance](docs/acceptance/S02-plan-and-review.md) and [submission checklist](SUBMISSION_CHECKLIST.md).

## Product and baseline

**OpsCrew — Evidence-backed Expense Exception Workflow** helps a user turn synthetic USD expense information into a reviewable exception case. The selected theme is **Future of Work & Enterprise Productivity**, subject to matching the actual submission portal field. The official page lists that theme alongside six current themes; another category paragraph on the same page is inconsistent. [Official challenges](https://aibuildercup.com/themes.html)

The starting point is commit [`c7adfd6`](https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew/commit/c7adfd61777d34846e6a6f0b0f2b5d02328d305e), created from a blank Google AI Studio Build app on 2026-10-07. The application is in `aistudio-export-2026-10-07/`. No earlier local application's code, deck, or video is part of this delivery. Google-generated work and subsequent local changes remain distinguishable in [PROVENANCE.md](PROVENANCE.md).

Historical evidence covers server-side Gemini fact extraction, unknown values, conflict disclosure, six offline tests, type checking, a frontend build, and a local startup without an API key. Successful AI Studio runs used `gemini-3.1-flash-lite`. These results do not verify the new workflow or a Cloud Run deployment. See [AI Studio acceptance](docs/aistudio-acceptance-2026-10-07.md), [runtime evidence](docs/runtime-evidence-2026-10-07.json), and [local validation](docs/local-validation-2026-10-07.md).

## Core delivery

The target path is:

`Input → Gemini facts → versioned synthetic policy → Gemini plan → separate Reviewer + server checks → human confirmation → Firestore case → independent readback receipt`

1. Preserve facts, missing information, source conflicts, integer USD cents, and input/run versions.
2. Write one synthetic company policy with approximately 6–8 clauses, stable clause IDs, a version, source text, and explicit boundaries.
3. Produce a plan grounded in those clauses. A separate Reviewer checks it; deterministic server rules retain the final veto. Model output never grants execution permission.
4. Show an English review screen with facts, gaps/conflicts, policy text, proposed case fields, revisions, and a clear confirmation action.
5. Expose one business action: `create_exception_case`. Confirm and create a synthetic exception case in Firestore, then independently read it back. Include rejection, editing/reanalysis, deduplication, and recovery.
6. Add Firebase Authentication, per-visitor ownership checks, persisted runs/plans, audit events, limits, error recovery, and a public Cloud Run demo. Use Secret Manager for server secrets.
7. Deliver reproducible source, an evidence-based evaluation, an English proposal PDF/deck, a public demo video, and a verified submission receipt.

Creating a case means authorizing a sandbox record. It does not approve reimbursement or payment. The same demo visitor may review and confirm their own case; this is not production separation of financial duties. Use only synthetic data in a team-controlled sandbox.

## Execution contract

- The server verifies the Firebase token and derives the UID. Client-provided user IDs, roles, `approved=true`, or action names cannot add privileges.
- Only a current, owned, validated plan can be confirmed. Changes to input, plan contents, or policy version invalidate previous analysis and confirmation.
- Business uniqueness is `(UID, plan ID/version, action)`. Double clicks, concurrency, response loss, and different client idempotency keys for the same plan/action must produce one case. Reusing a key for different contents must fail.
- One Firestore transaction commits the confirmation snapshot, deterministic case ID, case, success audit event, and idempotency result. No Gemini call or other external side effect runs inside the transaction. Success is shown only after a separate case readback.
- Unconfirmed, rejected, stale, unauthorized, invalid, or pre-commit failed commands create **zero business cases**. A post-commit response/readback failure must recover the existing case and remain unverified in the UI until readback succeeds. Draft/run/audit persistence is allowed and is reported separately.
- Missing receipts may support a request-for-evidence case when required identity/amount/scope fields are complete. Missing required case fields, unresolved source conflicts, or no applicable policy block creation. Complete compliant expenses may require no case. S1 freezes the exact policy branches.

Suggested server states are `DRAFT`, `ANALYZED`, `NEEDS_INFO`, `BLOCKED`, `REVIEWABLE`, `APPROVED`, `SUBMITTED`, `REJECTED`, and `NO_ACTION_REQUIRED`. The server owns valid transitions; `APPROVED` must never be displayed as reimbursement approval. See the [evaluation protocol](docs/EVALUATION_PROTOCOL.md) for release gates.

## Boundaries and resources

The stack remains React + TypeScript, Node.js + Express, and the official `@google/genai` SDK, with Firebase Authentication, Firestore, Secret Manager, and Cloud Run added. Model steps use bounded requests and recorded progress; persistent recovery is added with S3. ADK migration, ERP/OA integrations, real financial accounts, payments, real-receipt OCR, multiple currencies, and general browser agents are outside the core scope. Only after all core gates pass may one enhancement be selected: case JSON download or an improved audit timeline.

The user approved a **USD 40 management target** for new development/review resources through 2026-11-06. This is not a price quote or guaranteed bill cap. The first new paid resources require a concrete project/region/service/model/limits configuration and separate user confirmation. Account eligibility, billing, credits, IAM, region, and current model availability/pricing remain unverified. Start with the historically tested model; a more expensive model or additional paid service needs authorization. Alerts-only budgets do not impose a hard spending limit; any service-specific cap must be checked for its actual coverage. [Google Cloud budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets)

The public repository exists, but a formal public Cloud Run/Firebase URL, new-version cloud acceptance, final materials, and formal submission are still pending. An AI Studio preview or frontend-only preview does not satisfy the deployment gate. See [README.md](README.md) for current setup and [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md) for the final evidence map.
