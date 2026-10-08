# OpsCrew — Expense-Exception Intake

A Google AI Studio Build prototype for extracting facts, missing information, and conflicts from **synthetic USD expense intake**. The UI sends intake to a server-side Gemini call, then displays validated facts and runtime telemetry. It does not approve expenses, make payments, persist expense records, or implement ADK/Planner orchestration.

The application was generated in a blank Google Build app without importing the earlier local application's source. Read [PROVENANCE.md](PROVENANCE.md) for the export history and subsequent local changes. The [AI Studio app](https://aistudio.google.com/apps/e8a0fb37-f747-45d2-b376-b832ac7fe09f) and its development preview are not a formal public contest deployment.

S0/S1 implementation began on 2026-10-09 after plan approval. The current stage adds synthetic policy/contracts, development fixtures and production packaging. The visible app remains an intake prototype; policy planning, authentication, persisted cases and human-authorized creation are later stages. See [scope](SCOPE.md), [delivery workboard](docs/DELIVERY_WORKBOARD.md), [policy/contracts](docs/POLICY_AND_CONTRACTS.md), and [deployment preparation](docs/DEPLOYMENT.md).

Current acceptance: [S0 scope and prerequisites](docs/acceptance/S00-scope-and-prerequisites.md) and [S1 engineering foundation](docs/acceptance/S01-engineering-foundation.md). On October 9, 25 offline tests, type checking, the build and seven local production HTTP checks passed. Account, real container and cloud gates remain pending.

## Repository layout

- `aistudio-export-2026-10-07/` — exported application and offline tests; run npm commands here.
- [PROVENANCE.md](PROVENANCE.md) — source origin and local-change record.
- [Runtime evidence](docs/runtime-evidence-2026-10-07.json) — recorded AI Studio runtime results; historical evidence, not a guarantee about a new local run.
- [CONTRIBUTING.md](CONTRIBUTING.md) — teammate workflow and PR checks.

This outer README is the current local setup guide. The dated application directory retains its original export name; subsequent local changes are recorded in Git and provenance.

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

Use your own Gemini key only if you will run live analysis. Keep it in `.env` on the server; never add it to source, screenshots, PRs, browser code, or a `VITE_` variable. Offline checks need no key. The current server and initial UI default are `gemini-3.1-flash-lite`; configure it explicitly for reproducibility. A model appearing in the allowlist does not establish account availability or a free billing tier.

Start the full local app:

```powershell
npm run dev
```

Open [localhost:3000](http://localhost:3000). Use the synthetic presets, confirm the selected model is `gemini-3.1-flash-lite`, then run analysis if live API access is configured. Loading the page alone does not prove a Gemini call succeeded. `npm run preview` serves only the built frontend; it is not the full server/API workflow.

Cloud deployment preparation is documented separately; actual deployment and the first new paid configuration remain pending.

## Check a change

From `aistudio-export-2026-10-07/`:

```powershell
npm test
npm run lint
npm run build
npm run smoke:production
```

`npm test` runs offline validator and route tests without a real key or live Gemini call. `npm run lint` runs TypeScript checking. `npm run build` checks the production frontend build. Record these results separately from any optional live Gemini test.

`npm run smoke:production` requires the built `dist` directory. It starts its own native Node production server with no Gemini credential, checks HTTP behavior, and stops that process. It makes no live Gemini request. `GET /api/health` is a local/container liveness check; it does not claim model or database readiness.

The handoff checks passed on 2026-10-07: 6 offline tests, TypeScript checking, and the frontend build. See [local validation](docs/local-validation-2026-10-07.md) for exact results and the disclosed dependency packaging fix.

For a live check, use synthetic data only and record the selected model, timestamp, observed facts/errors, and returned runtime telemetry. Do not include credentials. A failed API call must remain an error; it must not be reported as successful model output.

## Team handoff

The AI lead handles approved development and integration. The captain handles account/paid-resource steps, and the teammate reviews policy labels and cross-accepts the app. Follow [CONTRIBUTING.md](CONTRIBUTING.md); use a fork and PR, or a feature branch if invited to the repository.
