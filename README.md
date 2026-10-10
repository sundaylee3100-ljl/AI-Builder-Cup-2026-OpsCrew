# OpsCrew — Expense Exception Plan & Review

A Google AI Studio Build prototype extended locally to produce reviewable plans from **synthetic USD expense intake**. The server extracts facts, runs a separately prompted Gemini Planner and Reviewer, and checks every proposed fact, action and policy citation against fixed rules. The English UI shows the recommendation and actual attempt telemetry. S2 does not approve expenses, make payments, authenticate visitors or persist cases.

The application was generated in a blank Google Build app without importing the earlier local application's source. Read [PROVENANCE.md](PROVENANCE.md) for the export history and subsequent local changes. The [AI Studio app](https://aistudio.google.com/apps/e8a0fb37-f747-45d2-b376-b832ac7fe09f) and its development preview are not a formal public contest deployment.

S0/S1 local foundations and S2 planning/review were implemented on 2026-10-09 after approval. Authentication, human confirmation, persisted cases and public deployment remain later work. See [scope](SCOPE.md), [delivery workboard](docs/DELIVERY_WORKBOARD.md), [policy/contracts](docs/POLICY_AND_CONTRACTS.md), [S2 design](docs/S2_PLANNING_REVIEW.md), and [deployment preparation](docs/DEPLOYMENT.md).

Current acceptance: [S0 prerequisites](docs/acceptance/S00-scope-and-prerequisites.md), [S1 foundation](docs/acceptance/S01-engineering-foundation.md), and [S2 plan/review](docs/acceptance/S02-plan-and-review.md). On October 10, **104 offline tests and eight local production HTTP checks passed**, together with type checking and the build. Real missing-receipt browser integration and controlled offline cancellation/editing checks also passed. **G2 remains partial:** the current API works, but no-action facts and conflict review repeatedly timed out; all earlier failures remain in the evidence. Account, actual container and cloud gates remain pending; cloud deployment is explicitly deferred.

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
git switch --track origin/feat/s2-planning-review
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

Open [localhost:3000](http://localhost:3000). Use the synthetic presets, confirm the selected model is `gemini-3.1-flash-lite`, then run analysis if live API access is configured. Input edits invalidate older results. Planning and review produce recommendations with `execution_authorized: false`. Loading the page alone does not prove a Gemini call succeeded. `npm run preview` serves only the built frontend; it is not the full server/API workflow.

Cloud deployment preparation is documented separately; actual deployment and the first new paid configuration remain pending.

## Check a change

From `aistudio-export-2026-10-07/`:

```powershell
npm test
npm run lint
npm run build
npm run smoke:production
```

`npm test` runs offline policy, validator, planning-service and HTTP tests without a real key or live Gemini call. `npm run lint` runs TypeScript checking. `npm run build` checks the production frontend build. Record these results separately from any optional live Gemini test.

`npm run smoke:production` requires the built `dist` directory. It starts its own native Node production server with no Gemini credential, checks HTTP behavior, and stops that process. It makes no live Gemini request. `GET /api/health` is a local/container liveness check; it does not claim model or database readiness.

The handoff checks passed on 2026-10-07: 6 offline tests, TypeScript checking, and the frontend build. See [local validation](docs/local-validation-2026-10-07.md) for exact results and the disclosed dependency packaging fix.

For a live check after resolving the API prerequisite, use the permanent [opt-in runner](aistudio-export-2026-10-07/scripts/check-workflow-live.mjs) and a new evidence filename as described in the S2 acceptance report. The runner requires an environment-only key and explicit `--live`. Use synthetic data and retain actual failures; offline fixtures never stand in for live model output.

## Team handoff

The AI lead handles approved development and integration. The captain handles account/paid-resource steps, and the teammate reviews policy labels and cross-accepts the app. Follow [CONTRIBUTING.md](CONTRIBUTING.md); use a fork and PR, or a feature branch if invited to the repository.
