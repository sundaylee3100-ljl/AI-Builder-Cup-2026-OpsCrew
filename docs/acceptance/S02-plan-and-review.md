# S2 acceptance — AI plan and separate review

Updated: 2026-10-10 (Asia/Shanghai). Status: **LOCAL IMPLEMENTATION PASSED; LIVE ACCEPTANCE PARTIAL — G2 NOT FULLY PASSED**.

Branch: `feat/s2-planning-review`, based on S1 commit `913b0f8a4beb944ebedfa36fa49bf2af9aebab43`. S1 draft PR #1 is unmerged. The S2 delivery commit binds the source and this report; live reports truthfully record the precommit dirty working tree. Policy `synthetic-expense-usd-1.0.0`; contracts and public fixtures `1.0.0`. Windows, Node 24.14.0, npm 11.9.0, installed official `@google/genai` 2.27.0. Requested and returned model ID: `gemini-3.1-flash-lite`; the returned alias is not an immutable model release identifier.

Cloud deployment is explicitly deferred. S0 account/eligibility/portal and S1 actual container/cloud gates remain pending. This stage is a disclosed local continuation of the Google Build baseline, without importing the older application. It does not update the saved AI Studio app or verify Edge sign-in.

## Acceptance checklist

- [x] Server accepts intake only; client facts, plans, ownership, approval and actions cannot confer authority.
- [x] Facts are contract-validated and known amounts/receipt states are grounded in form or recognized narrative sources. Unsupported model inventions fail before planning. Multiple distinct narrative amounts or both receipt states retain a blocker.
- [x] Distinct bounded Planner and Reviewer calls use the official Gemini SDK. Deterministic rules retain final authority for all five branches and the exact USD 200 threshold.
- [x] Plans preserve every validated fact and evidence requirement. Citation IDs must exactly match complete deterministic support; original quotes and versions come from the frozen policy.
- [x] Invented/stale/missing/duplicate/irrelevant citations, unsafe actions and extra authority fields fail closed. An invalid Planner stops before Reviewer.
- [x] A restrictive Reviewer can stop a recommendation; PASS cannot clear deterministic conflicts or mandatory unknowns.
- [x] Server-generated run/input/facts/policy/plan bindings remain consistent; `local-preview` is explicitly unauthenticated development context.
- [x] Every result has `execution_authorized: false`; no case, approval, payment or reimbursement is created.
- [x] SDK hidden retries are disabled. Each role has at most two caller attempts, retrying only 429/503. Per-call, service and overall deadlines and cancellation are enforced.
- [x] Full actual steps appear in both top-level and workflow telemetry, including failed attempts, timing, model, upstream status and reported usage. Unknown usage/cost is not zero.
- [x] English UI shows original citations, proposed fields, review issues, prompt/version bindings, safe errors and completed attempts. It does not invent within-request progress.
- [x] All **104 offline tests**, type checking, frontend build and **eight production HTTP checks** pass.
- [x] Real browser success, policy disclosure, full envelope, input invalidation, wide/narrow layouts and basic keyboard behavior observed.
- [x] Manual cancellation, editing during a request and absence of a late result observed using an explicitly injected five-second offline provider with no real API key or Gemini call.
- [x] All real live attempts and original failures retained unchanged in separate evidence files.
- [ ] Complete real no-action and conflict facts → Planner → Reviewer acceptance on the current prompt version. Missing-receipt and over-threshold cases passed; the two remaining cases repeatedly timed out.
- [ ] Establish a stable complete live suite before declaring G2 passed. No further live call is queued or scheduled.
- [x] Final format/link/credential/temporary-file verification recorded below; the delivery commit and draft PR provide the source handoff.

## Test methods and results

Run from `aistudio-export-2026-10-07`:

```powershell
npm test
npm run lint
npm run build
npm run smoke:production
node --check scripts/check-workflow-live.mjs
```

| Check | Expected | Actual |
| --- | --- | --- |
| Offline suite | Semantic and failure gates pass without Gemini | **104/104 passed**, no failed/skipped tests; final elapsed 7,299.995 ms |
| Test coverage groups | Preserve facts/citations/authority, version bindings, retries, timeouts and failures | 61 planning service; 28 policy/contract/extraction; 10 workflow HTTP; 5 live-runner verifier/selection/stop/redaction groups |
| Type check | No TypeScript errors | Exit 0 after final fixes |
| Frontend build | S2 frontend builds without server credentials | Exit 0; Vite 8.3.3, 1,661 modules, 3.46 seconds |
| Production smoke | Own native Node process serves dist and API, then stops | **8/8 passed**, final elapsed 3,948 ms; no credentials or model calls |
| Runner native syntax / opt-in | Permanent runner works with Node 24; requires explicit live intent and docs-only new output | Syntax passed; missing `--live` and outside-docs output rejected before calls/files |
| Static UI rendering | Outcomes, citations and failures render consistently | 14 static SSR groups and two prompt-version variants passed on October 9; not browser/model tests |
| Live development suite | Expected semantics, all actual roles, matching bindings and exact citations | Partial; detailed records below, never substituted by fixtures |
| Browser integration | Real result, original support, versions, edits clear stale result | Passed for one real missing-receipt run; wide 1200 × 1000 and narrow 390 × 844 observed |
| Controlled browser cancellation | Cancel/edit before delayed response; no result reappears afterward | Passed with two offline requests and a five-second provider; no live Gemini call |

The offline suite uses injected providers and public development fixtures. It rejects changed facts, invented citations, payment actions, stale ownership/version bindings, malformed output and unsupported review verdicts. It verifies noncooperative providers, SDK-style timeouts, incoming deadlines before/during calls and retry waits, retained partial facts, safe malformed JSON and nested credential redaction. These tests measure service behavior, not model quality.

Production smoke checks actual root HTML and built asset, nested SPA refresh, S2 liveness, non-sensitive config, missing-key failure for both facts-only and full workflow, and API JSON 404. It establishes native local startup, not Linux-container, IAM, Firebase or cloud readiness. The existing Vite `__dirname` future-loader advisory is nonblocking.

Current prompt labels: facts `opscrew-facts-1.1.0`, Planner `opscrew-planner-1.0.1`, Reviewer `opscrew-reviewer-1.0.0`. Planner 1.0.1 explicitly preserves the authoritative branch/action/citation set and conflict precedence; strict validation was not relaxed. Initial October 10 evidence uses Planner 1.0.0. Failed original evidence is not rewritten after these changes.

Facts SDK timeout is 15 seconds, facts route deadline 25 seconds, whole workflow 90 seconds. Planner/Reviewer attempts are 20 seconds each with a combined 60-second limit. SDK `retryOptions.attempts: 1` disables hidden retries; caller-owned retries are at most two for 429/503 only. The runner bounds each local request to 95 seconds and performs no request-level retry. Separate revalidation requests are explicitly recorded, not hidden retries.

## Real Gemini evidence and failures

All keys were supplied only through local process environment; none was saved into code, evidence or public docs. Synthetic development inputs only. Node environment-proxy support was used on this workstation; TLS verification was not disabled. Account billing/tier and measured cost were not observed.

| Evidence | Observed result | Actual model attempts |
| --- | --- | --- |
| [October 9 original report](S02-live-validation-2026-10-09.json) | 0/4; every case stopped at FACTS with upstream 402. No Planner/Reviewer call. | 4 failures, usage unknown |
| [October 10 initial report](S02-live-validation-2026-10-10.json) | Three genuine successful chains returned correct outcomes and Reviewer PASS, but the runner misclassified them; conflict Planner was vetoed. Original outcomes remain FAIL. | 11 attempts, 13,665 reported tokens |
| [October 10 corrected-runner suite](S02-live-validation-2026-10-10-final.json) | DEV-04 and DEV-03 passed. DEV-01 facts timed out; DEV-10 Reviewer timed out after a validated conflict decision/Planner. | 10 attempts, 10,389 reported tokens; 2 failed attempts without usage |
| [October 10 targeted recovery](S02-live-validation-2026-10-10-recovery.json) | DEV-01 facts and DEV-10 Reviewer timed out again; 0/2. Same Planner 1.0.1; no weakened safety check. | 4 attempts, 2,185 reported tokens; 2 failed attempts without usage |
| [Real browser envelope](S02-live-ui-envelope-2026-10-10.json) | Missing-receipt input completed actual FACTS/PLANNER/REVIEWER; EVIDENCE_REQUEST, REVIEWABLE, Reviewer PASS; no execution. | 3 successful attempts, 4,113 reported tokens |

The initial runner incorrectly passed complete plan/review records to a strict binding-only validator, which rejected their additional legitimate fields. It now validates the full record first and projects only the seven binding fields for comparison; stale bindings remain rejected. A formal offline replay validates the three captured genuine successes under their historical prompt version. That replay makes **no new Gemini call** and does not change the original report's failed acceptance outcome. The first PowerShell wrapper did not propagate Node's nonzero exit; later wrappers explicitly return the captured exit code. No success claim relies on that shell exit alone.

The October 10 no-action result succeeded under Planner 1.0.0 but did not complete again under the final prompt version. The conflict branch was preserved safely in later runs, but its Reviewer did not finish. Therefore these records do **not** establish a complete current-version live acceptance suite. Three October 10 attempts for each unresolved fixture have been exhausted; further live calls stopped rather than repeating indefinitely.

Across all five evidence artifacts, **32 actual model attempts** are recorded: **30,352 known reported tokens**, with **eight failed attempts having unknown usage**. October 10 accounts for 28 attempts; the other four are the October 9 errors. The UI envelope repeats workflow steps at the top level; those duplicates are counted once. Measured billed cost remains unknown. Known-token totals are a lower bound on reported usage, not proof of total usage, a free tier or zero cost.

Google's [API error reference](https://ai.google.dev/gemini-api/docs/api-errors) and [troubleshooting guidance](https://ai.google.dev/gemini-api/docs/troubleshooting) support treating the earlier 402 as an access/payment prerequisite. The later owner-designated key successfully calls the API; no actual balance, Google project or billing configuration was diagnosed or changed. The remaining current blocker is observed timeout behavior, not an asserted continuing 402 condition.

The final telemetry-only correction labels SDK fact timeouts consistently as `GEMINI_REQUEST_TIMEOUT` instead of `GEMINI_API_ERROR_UNKNOWN`; a regression verifies this without another paid call. Earlier evidence remains unchanged. Thus live captures identify their actual precommit source/checkpoint; they are not silently represented as executions after this last metadata correction.

A future explicitly authorized recheck can select only unresolved public cases and must use a new report filename:

```powershell
node --use-env-proxy scripts/check-workflow-live.mjs --live --cases DEV-01,DEV-10 --output docs/acceptance/S02-live-validation-NEW-RUN.json
```

Use proxy support only where required. Supply the key in the process environment. `--cases` accepts only one to four unique IDs from the fixed public live suite; it cannot access held-out data or bypass the explicit `--live` requirement. No automatic model switch, billing activation or quota increase was performed.

## Browser observations

October 9 IAB checks observed initial UI, explicit MISSING_API_KEY with no facts/plan, editing that clears errors, default-case restoration, and Tab focus from amount to Available receipt. A 390 × 844 viewport had client/scroll width 375/375 with no horizontal document overflow. [Initial desktop](S02-local-ui-desktop-2026-10-09.jpg) is the default viewport, not a wide-screen proof; [initial mobile](S02-local-ui-mobile-2026-10-09.jpg) is separate.

October 10 used the real local app and owner-designated API for one exact DEV-04 input. The browser displayed a USD 38 receipt-evidence plan, original policy text, separate Reviewer PASS, prompt versions and all three actual attempt records. The [captured full envelope](S02-live-ui-envelope-2026-10-10.json) came from the visible Full Run Envelope DOM, not a fabricated fixture. [Wide policy disclosure](S02-live-ui-desktop-2026-10-10.png), [plan and review](S02-live-ui-review-2026-10-10.png), and [narrow result](S02-live-ui-mobile-2026-10-10.png) are retained. Narrow document widths again matched at 375/375. Editing amount to 39.00 immediately cleared the successful facts, plan and review.

A separate loopback server used `createApp`'s injected provider and the built frontend, with an explicitly fake offline key and a five-second fact delay. Two browser requests checked manual Cancel waiting and editing while pending. Both returned to No Current Plan or Review; after the provider delay elapsed, no result reappeared. The [offline invalidation screenshot](S02-offline-ui-invalidation-2026-10-10.png) is labeled as offline evidence. It is not a Gemini success, and no mock is wired into the product or used as an API-error fallback. This verifies these observed interactions, not every possible timing race or complete accessibility compliance.

Temporary viewport overrides were reset. All lead-created browser test tabs and servers, including the credential-bearing local preview process, were closed/stopped. Edge account automation remained unavailable; it was not bypassed using a different signed-in account.

## Review fixes, limits and delivery

Independent review identified unsafe malformed-JSON echo and restrictive Reviewer precedence; both are corrected with regressions. Final cross-review found incoming deadlines mislabeled as cancellation and unsupported extracted amount/receipt inventions; both are corrected with source-grounding and deadline regressions. Full top-level attempt telemetry and acceptance binding projection were also corrected. No deterministic guard was removed to make live cases pass.

Amount grounding currently recognizes explicit dollar numeric tokens; receipt grounding uses fixed English signals. Unsupported narrative-only formats must be clarified or supplied through structured fields. Multiple distinct dollar amounts conservatively block a case rather than guessing the expense total. Rationale remains bounded advisory text and cannot confer authority. Separate calls to the same model are operational separation, not proof of independent errors or perfect review quality.

S3 must add verified identity, durable snapshots, current versions/digests, explicit human confirmation, atomic case/idempotency/audit writes and independent readback. No Auth/Firestore resource, durable case, cloud URL, payment, held-out evaluation or submission was created here. All public fixtures remain development cases; sealed S5 examples were not accessed.

Final delivery verification on October 10: 20 UTF-8 Markdown documents, 124 local links and 11 JSON files passed parsing/format/link checks. Public source and built client assets had no literal credential or server-key/SDK leakage matches; forbidden upload paths were absent. The shared-workspace Path.glob scan covered 10,835 entries with no `tmp_*`, `.pyc`, `__pycache__` or `nul`; six existing formal project/dependency `test_*` files were preserved. No disposable debug script or key file was created. Formal tests, live reports, screenshots and the local production build required by smoke checks are retained; generated dependencies/build output are ignored and not uploaded. Historical rejected cache deletions are not retried or silently marked complete. The stage branch is a draft checkpoint based on unmerged S1 PR #1; source identity is the S2 commit/PR, not the precommit report baseline alone.

**Gate decision:** S2 local implementation and browser integration are reviewable. **G2 remains unpassed because complete current-version real no-action/conflict acceptance is unresolved.** Cloud deployment remains deferred. The stage PR is a development checkpoint, not a release or contest submission.

Related: [S0](S00-scope-and-prerequisites.md), [S1](S01-engineering-foundation.md), [workboard](../DELIVERY_WORKBOARD.md), [evaluation protocol](../EVALUATION_PROTOCOL.md), [S2 design](../S2_PLANNING_REVIEW.md), [provenance](../../PROVENANCE.md).
