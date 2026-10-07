# Google Build provenance

Created: 2026-10-07 (Asia/Shanghai).

Application: https://aistudio.google.com/apps/e8a0fb37-f747-45d2-b376-b832ac7fe09f

The team chose to rebuild the OpsCrew concept in a blank Google AI Studio Build app. No source files from the existing local application were imported. The code in `aistudio-export-2026-10-07` was downloaded through Google Build's Export → Download as .zip UI. Before publication, local work consisted of read-only review, runtime acceptance through the preview, and documentation. Application corrections were requested from Google Build rather than authored into the application locally. The later local dependency packaging change is disclosed below.

Initial exported archive SHA-256: `4ec411d1a7b1939db152be055fd79820c8516c7621e4cd6d2f65a5a2cb89c08e`

Final export contains 14 files, including the Google-generated offline test suite. The local source directory was updated from the final saved hardening checkpoint. Final archive SHA-256: `ad716d8aeeb8dbc50c26cce639dfc6dadd20bd2b53730390543b9a17daf8efca`. No literal credential was found in the export.

The live AI Studio environment sets GEMINI_MODEL=gemini-3.1-flash-lite; reopening the preview showed that selection. The source fallback is gemini-3.8-flash, so configure GEMINI_MODEL when running this export elsewhere. Server secrets are not included in the ZIP.

Real successful runtime envelopes are saved in [runtime evidence](docs/runtime-evidence-2026-10-07.json), with [AI Studio acceptance](docs/aistudio-acceptance-2026-10-07.md). Offline validator checks are separate from live model runs and must never be reported as live Gemini success. The [initial prompt](docs/initial-build-prompt-2026-10-07.md) and [hardening prompt](docs/hardening-prompt-2026-10-07.md) contain no credentials.

The AI Studio editor URL and development preview are not a formal public contest deployment. No GitHub push, Publish, billing activation or recharge was executed during the initial creation/acceptance phase.

## Local packaging and GitHub handoff — 2026-10-07

The user subsequently authorized a new public repository at `sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew`. This repository contains only the Google Build prototype and its handoff documentation; the older local application is excluded.

An ordinary npm install of the original export failed with ERESOLVE: Vite 8.3.3 requires optional peer esbuild `^0.27.0 || ^0.28.0`, while the generated manifest requested `^0.25.0`. The sole change to the 14 original exported files is `package.json`: the esbuild development dependency is now `^0.28.0`. This is a local packaging correction, not a Google-generated change. A generated npm lockfile and repository-level collaboration documentation are added separately. Application TypeScript, UI, configuration and the Google-generated test suite retain the exported contents.

The original archive hash above identifies the untouched Google export, not the complete GitHub repository. Local validation and source comparison results are recorded in [local validation](docs/local-validation-2026-10-07.md). Git history records later team changes. No credentials, node_modules or generated frontend bundle are included. GitHub publication does not deploy Cloud Run/Firebase or activate billing.
