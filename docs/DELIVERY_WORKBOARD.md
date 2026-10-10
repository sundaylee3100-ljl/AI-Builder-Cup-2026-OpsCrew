# Delivery workboard

Updated: 2026-10-10 (Asia/Shanghai). The user approved the delivery plan and USD 40 management target on October 8. S0/S1 local preparation and engineering checks passed; their external prerequisites remain unresolved. The user authorized S2 on October 9 and explicitly deferred cloud deployment. G2 local functional planning/review acceptance passed through corrected strict verification of four genuine live branches and browser/offline checks. Evidence spans two bounded timeout profiles; earlier failures remain preserved and repeated reliability is still S4/S5 work. Historical checks remain historical. See [scope](../SCOPE.md), [submission checklist](../SUBMISSION_CHECKLIST.md), and [evaluation protocol](EVALUATION_PROTOCOL.md).

## Ownership

| Owner | Responsibility |
| --- | --- |
| AI lead | Full application development, integration, meaningful tests, deployment configuration and authorized deployment, evaluation tooling, English docs, PDF/video production, submission preparation and receipt organization |
| Parallel agents | Bounded implementation/review tasks with separate file ownership; independent evaluation custody when eligible; report evidence and cleanup to the lead |
| Captain | Accounts, login/CAPTCHA, first paid-resource confirmation, budget changes, eligibility/team data, personal/copyright declarations, actual portal checks and final hands-on acceptance |
| Teammate | Review synthetic policy/labels, hold sealed evaluation cases or audit independent evaluation, cross-accept the product, and record real task timings/feedback; main development remains with the AI lead |

Routine approved implementation, fixes and tests continue autonomously. Stage reports are checkpoints for visibility; they do not introduce repeated approvals for ordinary development. Account/paid-resource and personal-declaration boundaries still apply. Do not push unpublished changes without user authorization.

## Stage board

Dates below preserve the original internal Asia/Shanghai targets; they do not claim those targets were met. S0/S1 actually began October 9. Unknown portal timing, access and paid-resource prerequisites remain explicit dependencies. Cloud deployment is deferred by instruction; local progress does not establish deployed acceptance.

| Stage | Target | Status | Deliverables | Gate / evidence |
| --- | --- | --- | --- | --- |
| S0 — Scope and prerequisites | Oct 08 | Partial: local preparation complete; external checks pending | Scope, submission map, resource inventory, ownership, budget/risk record, preregistered evaluation | [G0 report](acceptance/S00-scope-and-prerequisites.md): account/eligibility/portal/paid configuration still unresolved |
| S1 — Engineering and policy | Oct 08–09 | Local foundation passed; real container/cloud checks pending | Reproducible baseline, policy v1, schemas/state/error/version contracts, 12 development cases, container/deployment configuration, local production smoke | [G1 report](acceptance/S01-engineering-foundation.md): 25/25 offline tests, type/build and 7/7 local production checks passed; real deployment/model evidence pending |
| S2 — Plan and review | Oct 09–10 | G2 local functional acceptance passed; cloud deferred | Bounded facts/Planner/Reviewer workflow, supported original citations, deterministic veto, English review UI, opt-in live validation and failure evidence | [G2 report](acceptance/S02-plan-and-review.md): 105/105 offline tests, type/build and 8/8 production checks passed; real browser missing-receipt plan/review observed; all four required real branch captures semantically accepted; earlier timeouts remain a reliability risk |
| S3 — Confirmation and cases | Oct 10–12 | To do | Auth ownership, persistent runs/plans, version-bound human confirmation, atomic case/idempotency/audit, independent readback and recovery | G3: emulator ownership/approval/revision/concurrency/failure checks plus a real authorized Firestore write and readback |
| S4 — Cloud and UX | Oct 12–13 | To do | Public sandbox URL, secrets/IAM, limits, production startup, recovery, rollback and accessible English flow | G4: signed-out public entry, real cloud end-to-end, identity isolation, limits, keyboard/narrow-screen checks and rollback drill |
| S5 — Independent evaluation | Oct 13–14 | To do | 8 sealed held-out cases, semantic/safety results, repeats, redacted run evidence, timing/usage/cost and real feedback when available | G5: held-out 8/8; 100% critical safety; four high-risk cases ×3; main demo ×3 consecutive; no unsupported benefits |
| S6 — English package and freeze | Oct 14–16 | To do | Proposal PDF/editable deck, <180 s public video/subtitles, final English docs, manifest and release snapshot | G6: rendered/viewed materials match accepted app; anonymous links; clean reproduction, secret scan and temporary-file cleanup |
| S7 — Submission and receipt | Oct 17 | To do | Actual portal submission, Submitted receipt/ID/time, final field/link recheck, evaluation-period maintenance handoff | G7: submitted state verified, all URLs accessible, budget/availability responsibility confirmed |
| Conditional — Finale | After shortlist notice | Conditional | Actual-notice demo/Q&A/recovery package; two members handle travel/visas | Start only if shortlisted; dates/format and continued resource budget rechecked |

G0 account items and early-cloud G1 checks are not passed merely because local development is allowed. The [submission checklist](../SUBMISSION_CHECKLIST.md) holds their current unresolved status. Internal freeze is October 16 and submission is October 17; the official October 18 date has no public exact time/timezone. [Official timeline](https://aibuildercup.com/index.html)

## Current evidence and open dependencies

| Item | Status | Next evidence |
| --- | --- | --- |
| Blank Google Build baseline `c7adfd6` | Historical complete | Preserve [provenance](../PROVENANCE.md); record new local/Google changes honestly |
| Baseline Gemini 3.1 Flash-Lite facts, unknowns, conflicts and default reopening | Historical passed | [AI Studio acceptance](aistudio-acceptance-2026-10-07.md) and [runtime JSON](runtime-evidence-2026-10-07.json); new-version/cloud acceptance still required |
| Baseline six offline tests, type/build and no-key startup | Historical passed; included in the new suite | [Historical local validation](local-validation-2026-10-07.md); [S1 current results](acceptance/S01-engineering-foundation.md) |
| New S0 documents / S1 policy, contracts and packaging | Local implementation and checks passed; draft review prepared | [S0 report](acceptance/S00-scope-and-prerequisites.md), [S1 report](acceptance/S01-engineering-foundation.md); no full G0/G1 passage claim |
| S0/S1 source handoff | [Draft PR #1](https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew/pull/1), not merged into `main` | Preserve baseline `913b0f8`; S2 is on `feat/s2-planning-review` in [draft PR #2](https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew/pull/2), based on the unmerged S1 branch |
| S2 semantic implementation / offline engineering | Passed: 105/105 offline and 8/8 production HTTP checks; type/build passed | [S2 implementation guide](S2_PLANNING_REVIEW.md) and [acceptance report](acceptance/S02-plan-and-review.md); final lead rerun passed; shared-workspace delivery checks recorded in the S2 report |
| S2 UI rendering and observed local browser behavior | 14 static SSR check groups plus 2 prompt-version variants; initial view, explicit no-key failure, stale-result clearing, default restoration, keyboard focus and narrow-screen layout observed | [Desktop capture](acceptance/S02-local-ui-desktop-2026-10-09.jpg), [mobile capture](acceptance/S02-local-ui-mobile-2026-10-09.jpg), and [methods/limits](acceptance/S02-plan-and-review.md); October 10 real missing-receipt success and input invalidation observed; cancellation/editing/late-result checks also observed with a separate offline delayed provider |
| New live S2 model acceptance | Functional passed: genuine no-action, missing-receipt, over-threshold and blocked-conflict captures pass strict semantic revalidation; earlier 402/timeouts remain retained | [Original 402 evidence](acceptance/S02-live-validation-2026-10-09.json), [corrected suite](acceptance/S02-live-validation-2026-10-10-final.json), [targeted timeout recheck](acceptance/S02-live-validation-2026-10-10-recovery.json) and [real browser envelope](acceptance/S02-live-ui-envelope-2026-10-10.json), [extended-deadline capture](acceptance/S02-live-validation-2026-10-10-extended-deadline.json) and [zero-call semantic revalidation](acceptance/S02-captured-result-revalidation-2026-10-10.json); all attempts retained, failed usage and billed cost remain unknown |
| Team eligibility, actual portal fields/deadline, account/region/IAM/billing/model access checks | Pending captain/account evidence; Edge account-browser connection remains unavailable | Complete explicit checklist items; the in-app browser's local-app QA does not verify AI Studio sign-in, Google project access, billing or eligibility |
| First new paid configuration | Pending separate confirmation | Concrete resource settings and cost controls before activation; USD 40 target is not a bill cap |
| New cloud URL | Deferred by the user | No cloud resource or deployed URL created; complete actual container/IAM/deployment gates only when resumed and authorized |
| Repeat stability, held-out evaluation, PDF/video and submitted state | Pending | G2 functional branch evidence is accepted; no single clean full-suite rerun, repeat-stability, held-out or submission-completion claim yet |

The 14 static SSR groups comprise one initial-App group, twelve public development-case groups and one failed-step telemetry group, with multiple assertions and partial-failure variants inside eligible-case groups. Two additional variants checked optional prompt-version rendering. These checks use static React rendering, not live Gemini or interactive browser execution. Observed local browser QA checked a 390 × 844 viewport with no horizontal document overflow; October 10 real browser workflow evidence is separate. The [S2 report](acceptance/S02-plan-and-review.md) is the source for test methods and remaining acceptance items.

The live runner attempted DEV-01, DEV-04, DEV-10 and DEV-03 before its stop-on-402 behavior was corrected. All four unsuccessful attempts remain in the original evidence. The current owner-designated key worked on October 10. After three attempts at the original bounds, the single-call timeouts were increased without increasing the 90-second workflow limit. One targeted run then completed both remaining real chains. The verifier was corrected to accept a properly blocked conflict review; zero-call captured-result revalidation passed all four required branches. Further live calls stopped. No automatic billing activation, top-up or account change was performed. G2 local functional acceptance passed across disclosed checkpoints; repeated reliability remains unverified.

## Risk triggers and response

| Trigger | Response |
| --- | --- |
| Oct 09: cloud deferred and account prerequisites unresolved | Continue authorized local work; retain pending container/cloud gates; captain resolves account checks before resuming dependent operations |
| Oct 09: live Gemini returns upstream 402 | Preserve every failed attempt, stop further live calls, and ask the owner to resolve the actual API prerequisite; do not infer verified billing state or activate payment automatically |
| Oct 12: full workflow not passing | Drop enhancements; focus on one policy, one case action, safe confirmation, uniqueness and readback |
| Model instability or latency | Bound calls/retries, narrow output, pin measured versions, record every failure; never substitute a successful mock |
| Oct 14: critical safety gate fails | Fix and retest before releasing the complete execution flow; materials reflect actual accepted scope |
| Oct 16: recording/material blocker | Use the accepted version and simpler real recording; captain/teammate records if local tooling cannot |
| Cleanup denied by system | Record rejected action and remaining paths; do not bypass or mark cleanup complete |

## Stage completion record

For each stage, write `docs/acceptance/Sxx-<stage>.md` with: outcome and outstanding dependencies; itemized checks; methods/inputs/expected/actual results; commit/policy/prompt/model/cloud versions; redacted run/case evidence; timings/usage/retries/cost unknowns; failures/fixes/limitations; and the temporary-file scan/cleanup result. Mark a stage complete only after its gate and cleanup are satisfied. Preserve formal tests and required outputs during cleanup.

Use small stage branches/changes. Keep public claims, runtime evidence, screenshots and materials tied to the same release. Retain no credentials or personal eligibility evidence in public documents.
