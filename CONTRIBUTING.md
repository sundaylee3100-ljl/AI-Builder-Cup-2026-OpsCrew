# Contributing

Keep changes small and reviewable. The visible prototype extracts synthetic expense facts, missing information, and conflicts. The approved [scope](SCOPE.md) adds bounded planning/review, authentication, persistence and human-confirmed creation of one synthetic exception case in later stages. Reimbursement approval, payments and ADK remain outside that scope.

## First contribution

1. Follow the outer [README](README.md) to install and run the app.
2. Run `npm test`, `npm run lint`, `npm run build`, and `npm run smoke:production` inside `aistudio-export-2026-10-07/`.
3. Review the synthetic presets and report any mismatch between inputs, displayed facts, and error states. Distinguish observed behavior from expected behavior.
4. Open a small PR with the checks you actually ran.

The AI lead handles implementation and integration under the approved plan. The captain handles account/paid-resource and personal-declaration steps. The teammate reviews policy labels, tests the UI and cross-accepts stage results; see the [workboard](docs/DELIVERY_WORKBOARD.md). Cross-review before merging; an author's own successful run does not replace the other teammate's review.

## Branch and PR workflow

For this public repository, fork it to your account and clone your fork. If invited as a collaborator, you can instead use a branch in the shared repository. Create a branch from an up-to-date `main`:

```powershell
git switch main
git pull --ff-only
git switch -c feat/your-change
```

Make the change, then run the applicable checks from the app directory. Review the diff from the repository root before committing:

```powershell
git status --short
git diff --check
git diff
git add <specific-files>
git commit -m "Describe the resulting change"
git push -u origin feat/your-change
```

In GitHub, open a pull request targeting `sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew:main`. Use the PR template, request the other teammate's review, and address feedback on the same branch. Merge through the PR workflow; do not push directly to `main`.

## Validation and evidence

- **Offline:** `npm test` uses policy/contract and validator/route tests without a Gemini key or live request. `npm run lint` is TypeScript checking. `npm run build` builds the frontend. `npm run smoke:production` then checks a local production server without credentials. Include command results and any failure details in the PR.
- **UI:** use `npm run dev` at [localhost:3000](http://localhost:3000). Check synthetic presets, missing inputs, contradictory inputs, loading, and error display as relevant to the change. Include screenshots when they help review.
- **Live Gemini (optional):** use your own server-side `.env` and explicitly configure `GEMINI_MODEL=gemini-3.1-flash-lite`. Record timestamp, selected model, synthetic case, returned telemetry, and outcome. Say **not run** if no live request was made. Offline tests and page loading are not live Gemini evidence.

Use fictional employee identifiers and synthetic expense narratives. Keep `.env`, API keys, personal data, dependency directories, build output, and temporary/debug files out of commits. Before the PR, remove temporary files created for your work and inspect staged files with `git diff --cached`.

## Preserve source history

Describe whether a change came from a new Google Build export or a local edit. Record material export or application changes in [PROVENANCE.md](PROVENANCE.md), including what changed and the validation performed. Preserve the distinction between the original generated source and later local packaging, documentation, or application edits.

Do not describe a recorded runtime result as a new run, claim a check passed without running it, or treat mock/offline output as live Gemini output. The [recorded evidence](docs/runtime-evidence-2026-10-07.json) is a reference for comparison.
