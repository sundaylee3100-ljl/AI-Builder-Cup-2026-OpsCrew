# Delivery workboard

Updated: 2026-10-09 (Asia/Shanghai). The user approved the delivery plan and USD 40 management target on October 8. S0/S1 began on October 9 and are in progress; S2 onward is to do. Historical checks remain historical. See [scope](../SCOPE.md), [submission checklist](../SUBMISSION_CHECKLIST.md), and [evaluation protocol](EVALUATION_PROTOCOL.md).

## Ownership

| Owner | Responsibility |
| --- | --- |
| AI lead | Full application development, integration, meaningful tests, deployment configuration and authorized deployment, evaluation tooling, English docs, PDF/video production, submission preparation and receipt organization |
| Parallel agents | Bounded implementation/review tasks with separate file ownership; independent evaluation custody when eligible; report evidence and cleanup to the lead |
| Captain | Accounts, login/CAPTCHA, first paid-resource confirmation, budget changes, eligibility/team data, personal/copyright declarations, actual portal checks and final hands-on acceptance |
| Teammate | Review synthetic policy/labels, hold sealed evaluation cases or audit independent evaluation, cross-accept the product, and record real task timings/feedback; main development remains with the AI lead |

Routine approved implementation, fixes and tests continue autonomously. Stage reports are checkpoints for visibility; they do not introduce repeated approvals for ordinary development. Account/paid-resource and personal-declaration boundaries still apply. Do not push unpublished changes without user authorization.

## Stage board

Dates below preserve the original internal Asia/Shanghai targets; they do not claim those targets were met. S0/S1 actually began October 9. Unknown portal timing, access and paid-resource prerequisites remain explicit dependencies.

| Stage | Target | Status | Deliverables | Gate / evidence |
| --- | --- | --- | --- | --- |
| S0 — Scope and prerequisites | Oct 08 | Partial: local preparation complete; external checks pending | Scope, submission map, resource inventory, ownership, budget/risk record, preregistered evaluation | [G0 report](acceptance/S00-scope-and-prerequisites.md): account/eligibility/portal/paid configuration still unresolved |
| S1 — Engineering and policy | Oct 08–09 | Local foundation passed; real container/cloud checks pending | Reproducible baseline, policy v1, schemas/state/error/version contracts, 12 development cases, container/deployment configuration, local production smoke | [G1 report](acceptance/S01-engineering-foundation.md): 25/25 offline tests, type/build and 7/7 local production checks passed; real deployment/model evidence pending |
| S2 — Plan and review | Oct 09–10 | To do | Bounded facts/plan/Reviewer steps, supported citations, deterministic veto, English review/progress UI | G2: semantic, citation, boundary, injection and failure tests; new live complete/missing-receipt/conflict scenarios with all attempts recorded |
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
| Team eligibility, actual portal fields/deadline, account/region/IAM/billing/model checks | Pending captain/account evidence; browser reconnection required after three failed connection attempts | Complete explicit checklist items; no verification claim from past registration |
| First new paid configuration | Pending separate confirmation | Concrete resource settings and cost controls before activation; USD 40 target is not a bill cap |
| New cloud URL, full workflow, held-out evaluation, PDF/video and submitted state | To do | Stage-specific records; no deployment or completion claim yet |

## Risk triggers and response

| Trigger | Response |
| --- | --- |
| Oct 09: cloud/account prerequisite unresolved | Continue local/emulator work; mark cloud gate blocked by that dependency; captain resolves account step |
| Oct 12: full workflow not passing | Drop enhancements; focus on one policy, one case action, safe confirmation, uniqueness and readback |
| Model instability or latency | Bound calls/retries, narrow output, pin measured versions, record every failure; never substitute a successful mock |
| Oct 14: critical safety gate fails | Fix and retest before releasing the complete execution flow; materials reflect actual accepted scope |
| Oct 16: recording/material blocker | Use the accepted version and simpler real recording; captain/teammate records if local tooling cannot |
| Cleanup denied by system | Record rejected action and remaining paths; do not bypass or mark cleanup complete |

## Stage completion record

For each stage, write `docs/acceptance/Sxx-<stage>.md` with: outcome and outstanding dependencies; itemized checks; methods/inputs/expected/actual results; commit/policy/prompt/model/cloud versions; redacted run/case evidence; timings/usage/retries/cost unknowns; failures/fixes/limitations; and the temporary-file scan/cleanup result. Mark a stage complete only after its gate and cleanup are satisfied. Preserve formal tests and required outputs during cleanup.

Use small stage branches/changes. Keep public claims, runtime evidence, screenshots and materials tied to the same release. Retain no credentials or personal eligibility evidence in public documents.
