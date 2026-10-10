# Google Build provenance

Created: 2026-10-07 (Asia/Shanghai).

Application: https://aistudio.google.com/apps/e8a0fb37-f747-45d2-b376-b832ac7fe09f

The team chose to rebuild the OpsCrew concept in a blank Google AI Studio Build app. No source files from the existing local application were imported. The code in `aistudio-export-2026-10-07` was downloaded through Google Build's Export → Download as .zip UI. Before publication, local work consisted of read-only review, runtime acceptance through the preview, and documentation. Application corrections were requested from Google Build rather than authored into the application locally. The later local dependency packaging change is disclosed below.

Initial exported archive SHA-256: `4ec411d1a7b1939db152be055fd79820c8516c7621e4cd6d2f65a5a2cb89c08e`

Final export contains 14 files, including the Google-generated offline test suite. The local source directory was updated from the final saved hardening checkpoint. Final archive SHA-256: `ad716d8aeeb8dbc50c26cce639dfc6dadd20bd2b53730390543b9a17daf8efca`. No literal credential was found in the export.

At the original acceptance checkpoint, the live AI Studio environment set GEMINI_MODEL=gemini-3.1-flash-lite; reopening the preview showed that selection. The original exported source fallback was gemini-3.8-flash. The S1 local continuation below aligns that fallback with the accepted model. Server secrets were not included in the ZIP.

Real successful runtime envelopes are saved in [runtime evidence](docs/runtime-evidence-2026-10-07.json), with [AI Studio acceptance](docs/aistudio-acceptance-2026-10-07.md). Offline validator checks are separate from live model runs and must never be reported as live Gemini success. The [initial prompt](docs/initial-build-prompt-2026-10-07.md) and [hardening prompt](docs/hardening-prompt-2026-10-07.md) contain no credentials.

The AI Studio editor URL and development preview are not a formal public contest deployment. No GitHub push, Publish, billing activation or recharge was executed during the initial creation/acceptance phase.

## Local packaging and GitHub handoff — 2026-10-07

The user subsequently authorized a new public repository at `sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew`. This repository contains only the Google Build prototype and its handoff documentation; the older local application is excluded.

At the first GitHub handoff (`c7adfd6`), an ordinary npm install of the original export failed with ERESOLVE: Vite 8.3.3 requires optional peer esbuild `^0.27.0 || ^0.28.0`, while the generated manifest requested `^0.25.0`. The sole change to the 14 original exported files at that checkpoint was `package.json`: esbuild became `^0.28.0`. This was a local packaging correction, not a Google-generated change. The npm lockfile and repository documentation were additions. Application TypeScript, UI, configuration and the Google-generated test suite retained the exported contents at that checkpoint.

The original archive hash above identifies the untouched Google export, not the complete GitHub repository. Local validation and source comparison results are recorded in [local validation](docs/local-validation-2026-10-07.md). Git history records later team changes. No credentials, node_modules or generated frontend bundle are included. GitHub publication does not deploy Cloud Run/Firebase or activate billing.

## Approved S0/S1 local continuation — 2026-10-09

After approving the full delivery plan, the user authorized implementation beginning with S0/S1. Changes in this stage are locally authored by the execution agents, rather than a new Google Build export. They add synthetic policy/contracts and development fixtures, runtime configuration separation, a liveness endpoint, production packaging/smoke checks, and delivery documentation. Server and initial UI defaults now use the previously accepted `gemini-3.1-flash-lite`; the UI default marker follows the server configuration instead of a hard-coded model name.

The original Google-generated intake and validator remain the foundation, with subsequent edits visible in Git. No old local application code is imported. Development fixtures are not held-out evaluation data. The policy and workflow contracts do not by themselves implement Planner/Reviewer, authentication, Firestore persistence or human-authorized case creation.

Edge Browser Use was detected, but three requests failed with `nodeRepl.fetch request failed`. Browser work is paused pending user reconnection. No new AI Studio mutation, live Gemini run, cloud resource creation or billing activation is claimed for this local continuation. Cloud/account and contest-dashboard items remain unverified until independently observed.

## Approved S2 local continuation — 2026-10-09–10

The user authorized AI planning and review, supplied project test API access, and explicitly deferred cloud deployment. These changes are locally authored extensions of the exported foundation, not a new Google-generated ZIP or a saved AI Studio editor update. They add server-side Gemini Planner and separate Reviewer calls, strict fact/action/citation gates, bounded attempt telemetry, English review UI, source-grounding hardening, versioned prompts, live acceptance tooling and meaningful offline regressions. Page title/metadata now describe the plan-and-review scope. No older local application code was imported, and the dependency lockfile was unchanged in S2.

Final local checks passed: 105 offline tests, type checking, frontend build and eight isolated production HTTP checks. Browser evidence includes one genuine Gemini missing-receipt plan/review, original policy text, version/attempt disclosure, successful-result invalidation and wide/narrow layouts. Cancellation and pending-edit checks used a separately injected delayed offline provider; that provider is not a product fallback. See [S2 acceptance](docs/acceptance/S02-plan-and-review.md) for methods, screenshots and exact boundaries.

All actual failures remain in the evidence: the October 9 test key returned four fact-stage 402 errors; the October 10 owner-designated key successfully ran Gemini, but later no-action facts and conflict reviews timed out. The initial acceptance verifier also misclassified three successful model chains because it passed full records to a binding-only validator; this was fixed with offline replay/stale-binding regressions, without rewriting the original report. The current prompt version clarifies deterministic conflict precedence, while all safety checks remain strict. The later bounded timeout profile completed real no-action and conflict chains. Strict captured-result revalidation accepts the conflict Reviewer BLOCKED outcome without loosening execution/citation/fact guards. G2 local functional acceptance passed across disclosed checkpoints; no single clean full-suite rerun or repeat-stability claim is made.

Keys were held only in local process environments, not source, docs or screenshots. Credential-bearing test servers and agent-created tabs were stopped/closed. S2 has no authenticated owner, human execution, persisted case, new cloud resource, billing activation or contest submission. The selected Google model powers the actual model calls; source origin and local changes remain separately disclosed.

## Approved S3 local continuation — 2026-10-10

The user confirmed S2 was merged and authorized S3. Initial GitHub verification showed PR #1 merged into main, while PR #2 merged into feat/s0-s1-foundation. The S3 branch starts from that merged S2 baseline (8d831bb) and merges origin/main. On the user's subsequent explicit instruction, the resulting S2-only merge commit c967803051966533f4c6f99cafb057dd3da087f0 was pushed to main and independently fetched back. Its tree exactly matches the merged S2 baseline; no uncommitted S3 change entered main. The S3 draft PR targets this updated main.

S3 is a disclosed local extension of the blank Google AI Studio Build foundation, using Firebase Authentication/Admin and Firestore alongside the existing Gemini chain. It adds trusted visitor ownership, server-assigned current revisions, persistent runs, human confirmation with input/plan SHA-256 and expiry, atomic synthetic case/approval/audit/idempotency writes, independent readback and recovery. No earlier local application's source was imported. The dependency lockfile changed for Firebase SDKs and the local emulator CLI; gRPC is pinned to a compatible security fix.

The stage's model providers in offline/emulator tests are explicitly injected fixtures, never a production fallback or claimed new live Gemini evidence. Genuine Firebase Auth/Firestore emulators exercise the database path; they do not establish a real cloud write. No new Google Build export, saved AI Studio update, account, cloud project, paid activation or public deployment is claimed. Native Computer Use detected the Comet AI Studio window, but three page captures failed, including after foreground activation, leaving the actual account/project configuration unverified. See the [S3 acceptance report](docs/acceptance/S03-confirmation-and-cases.md) for executed checks and pending G3 real-resource evidence.
