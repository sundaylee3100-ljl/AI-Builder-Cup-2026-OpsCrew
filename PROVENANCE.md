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
