# S1 acceptance — engineering and policy foundation

Date: 2026-10-09 (Asia/Shanghai). Status: **LOCAL CHECKS PASSED — G1 remains partial pending container and authorized cloud verification**.

Baseline: `c7adfd6`. Stage branch: `feat/s0-s1-foundation`; the stage commit and draft PR identify the reviewed source containing this report. Policy: `synthetic-expense-usd-1.0.0`. Contracts: `1.0.0`. Workstation: Windows, Node 24.14.0, npm 11.9.0. Default model configuration: `gemini-3.1-flash-lite`; no new live model call was made during this stage.

## Acceptance checklist

- [x] Clean lockfile installation succeeds without forced peer-dependency overrides.
- [x] Eight versioned synthetic USD policy clauses and deterministic decisions are documented and tested.
- [x] Twelve public development fixtures cover all five semantic branches; these are not held-out evaluation cases.
- [x] Strict facts/plan/review/approval/case schemas, citations, ownership/version bindings and legal state transitions are tested.
- [x] Missing receipt permits a supplement case when mandatory facts are known; unknown required facts and conflicts prevent case eligibility.
- [x] Only `create_exception_case` is allowed. Pure domain helpers always return `execution_authorized: false` and perform no writes.
- [x] New confirmations expire; recovery of a case committed before expiry remains valid after expiry. Commits at/after expiry are rejected.
- [x] Server/UI default-model configuration agrees; `/api/health` exposes only liveness metadata.
- [x] Type checking, frontend build and native Node production HTTP checks pass.
- [x] Dockerfile, ignore rules and a private-cloud deployment runbook are prepared and independently reviewed.
- [x] Source/provenance boundaries distinguish this local continuation from the original Google Build export.
- [ ] Build and run the actual Linux container; Docker is not installed on this workstation.
- [ ] Confirm the actual Google project, identities, region, model access, billing and first paid configuration.
- [ ] Deploy the private Cloud Run service and record its image digest/revision and authenticated HTTP results.
- [ ] Run and record a new authorized synthetic Gemini request in the deployed service.

## Executed tests and methods

Run from `aistudio-export-2026-10-07` with the documented Node/npm versions:

```powershell
npm ci --no-audit --no-fund
npm test
npm run lint
npm run build
npm run smoke:production
```

| Check | Expected | Observed |
| --- | --- | --- |
| Clean dependency installation | Lockfile accepted; no `force` or `legacy-peer-deps` | Exit 0; 180 packages installed |
| Full offline test suite after recovery fix | Every test passes; no real model call | **25/25 passed**, zero failed/skipped; 19 policy/contracts tests plus 6 original validator/HTTP tests |
| Type checking (`lint`) | No TypeScript diagnostics | Exit 0, including after the recovery fix |
| Production frontend build | Dist output produced | Exit 0; Vite 8.3.3; 1,660 modules transformed |
| Native Node domain import | Erasable TypeScript loads without `tsx` | Passed on Node 24; deterministic decision and legal transition returned expected values |
| Production HTTP smoke | Seven assertions pass; child process stops | **7/7 passed**, exit 0; observed smoke elapsed 1,121 ms |
| Formatting / secret check | No added whitespace errors or high-confidence credential patterns | `git diff --check` passed; source scan had no matches |

The integrated suite was rerun after the delayed-readback fix. The fix changes only pure domain logic, tests and policy documentation; it does not change the previously checked HTTP startup or frontend. Type checking and native Node import were also rerun for that fix.

The twelve fixtures have expected branches: three `NO_ACTION_REQUIRED`, two `MANUAL_REVIEW`, two `EVIDENCE_REQUEST`, three `NEEDS_INFO`, and two `BLOCKED`. Tests compare semantic labels, mandatory fields, evidence requirements, exact policy support and automatic-execution prohibition, rather than accepting any schema-valid output. Additional tests reject fabricated/stale/edited citations, unsupported actions, altered facts, stale owner/version/digest bindings, skipped confirmation and false durable-readback claims.

The production smoke starts its own isolated native Node process with no API credentials and a null dotenv path. It checks HTML from `dist`, one built JavaScript asset, nested SPA refresh, liveness JSON, non-sensitive configuration with the Lite default, `MISSING_API_KEY` before any Gemini request, and an unknown API JSON 404. It stops only its own child. This proves local production process behavior; it does not prove Linux image compatibility, cloud IAM, model access or database readiness.

## Review findings and limits

An independent review found that checking approval expiry at recovery time would reject a previously valid commit. The fix checks new approval validity at the current time, but checks a recovered case against its trusted commit time: `approved_at <= created_at < expires_at`, with readback no earlier than creation. Regressions cover delayed recovery and invalid commit times. S3 must obtain confirmation, timestamps, digests and durable results from authenticated server/persisted evidence; client-supplied flags cannot provide that authority. Recovery across future policy changes must use retained committed evidence, separately from authorizing new commands.

The existing Vite configuration emits a non-blocking advisory about a future native configuration loader and `__dirname`. Current build and production checks pass. The existing `node-domexception` deprecation advisory does not prevent installation. No dependency security audit, Linux image build or cloud execution is claimed by these results.

Planner/Reviewer model calls, authentication, Firestore, transactional case creation, idempotency, public access controls and the final contest materials remain later-stage work. The visible application still provides intake and fact extraction. The twelve public fixtures and these offline tests do not certify the final eight-case held-out evaluation or real Gemini quality. Historical October 7 live results remain historical.

## Cleanup and gate decision

The workspace was recursively scanned with `Path.glob`, including agent outputs, for `tmp_*`, `*.pyc`, `__pycache__`, `nul` and `test_*`. No temporary-pattern matches were found; six existing project/library `test_*` files are formal sources and were preserved. The formal smoke script/tests and required reports are retained. Dependency/build output stays ignored and is excluded from the source upload.

Earlier cache-deletion requests were rejected by automatic approval review with only `blocked by policy`; those deletions were not retried or bypassed, and that historical cleanup step is not marked complete. Required `dist` output is currently retained for reproducible production smoke checks. No new disposable debug scripts were created by this stage.

Local S1 foundation is ready for review. **G1 is not fully passed** until the real container/private-cloud/model checks above are observed. No cloud resources or new chargeable model calls were created. Continue with account-independent S2 work under the approved plan; account-dependent deployment waits for browser reconnection and the concrete first paid-resource confirmation.

Related: [S0 acceptance](S00-scope-and-prerequisites.md), [policy/contracts](../POLICY_AND_CONTRACTS.md), [deployment preparation](../DEPLOYMENT.md), [workboard](../DELIVERY_WORKBOARD.md), [evaluation protocol](../EVALUATION_PROTOCOL.md).
