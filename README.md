# OpsCrew — Expense-Exception Intake

A Google AI Studio Build prototype for extracting facts, missing information, and conflicts from **synthetic USD expense intake**. The UI sends intake to a server-side Gemini call, then displays validated facts and runtime telemetry. It does not approve expenses, make payments, persist expense records, or implement ADK/Planner orchestration.

The application was generated in a blank Google Build app without importing the earlier local application's source. Read [PROVENANCE.md](PROVENANCE.md) for the export history and subsequent local changes. The [AI Studio app](https://aistudio.google.com/apps/e8a0fb37-f747-45d2-b376-b832ac7fe09f) and its development preview are not a formal public contest deployment.

## Repository layout

- `aistudio-export-2026-10-07/` — exported application and offline tests; run npm commands here.
- [PROVENANCE.md](PROVENANCE.md) — source origin and local-change record.
- [Runtime evidence](docs/runtime-evidence-2026-10-07.json) — recorded AI Studio runtime results; historical evidence, not a guarantee about a new local run.
- [CONTRIBUTING.md](CONTRIBUTING.md) — teammate workflow and PR checks.

This outer README is the current local setup guide. The README inside the exported app is retained as generated history; use the install and model instructions below.

## Local setup

The handoff environment uses **Node.js 24.14.0 and npm 11.9.0**. Use the committed lockfile with `npm ci`.

```powershell
git clone https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew.git
cd AI-Builder-Cup-2026-OpsCrew
cd aistudio-export-2026-10-07
npm ci
Copy-Item .env.example .env
```

On macOS/Linux, use `cp .env.example .env` for the last command. Edit the new `.env` locally:

```dotenv
GEMINI_API_KEY="YOUR_OWN_KEY"
GEMINI_MODEL="gemini-3.1-flash-lite"
```

Use your own Gemini key only if you will run live analysis. Keep it in `.env` on the server; never add it to source, screenshots, PRs, browser code, or a `VITE_` variable. Offline checks need no key. Explicitly set `GEMINI_MODEL`: the original export otherwise falls back to `gemini-3.8-flash`.

Start the full local app:

```powershell
npm run dev
```

Open [localhost:3000](http://localhost:3000). Use the synthetic presets, confirm the selected model is `gemini-3.1-flash-lite`, then run analysis if live API access is configured. Loading the page alone does not prove a Gemini call succeeded. `npm run preview` serves only the built frontend; it is not the full server/API workflow.

Cloud deployment and billing setup are outside this handoff.

## Check a change

From `aistudio-export-2026-10-07/`:

```powershell
npm test
npm run lint
npm run build
```

`npm test` runs offline validator and route tests without a real key or live Gemini call. `npm run lint` runs TypeScript checking. `npm run build` checks the production frontend build. Record these results separately from any optional live Gemini test.

The handoff checks passed on 2026-10-07: 6 offline tests, TypeScript checking, and the frontend build. See [local validation](docs/local-validation-2026-10-07.md) for exact results and the disclosed dependency packaging fix.

For a live check, use synthetic data only and record the selected model, timestamp, observed facts/errors, and returned runtime telemetry. Do not include credentials. A failed API call must remain an error; it must not be reported as successful model output.

## Team handoff

Owner A handles integration and runtime configuration. Teammate B starts with local checks, UI review, and synthetic fixtures. Both review each other's PRs. Follow [CONTRIBUTING.md](CONTRIBUTING.md); use a fork and PR, or a feature branch if invited to the repository.
