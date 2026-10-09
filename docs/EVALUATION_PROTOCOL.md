# Evaluation protocol

Preregistered: 2026-10-09 (Asia/Shanghai), before S2 implementation or held-out generation. Status: protocol only; no held-out inputs or labels have been generated or scored here. These are team release gates, not organizer-mandated metrics. See [scope](../SCOPE.md), [workboard](DELIVERY_WORKBOARD.md), and [submission checklist](../SUBMISSION_CHECKLIST.md).

## Datasets and independence

Use **12 synthetic development cases** for implementation and prompt tuning. Their inputs, expected semantic outcomes, policy version and provenance are reviewable by developers. Cover complete compliant input, valid exception, exact/above-threshold amounts, missing receipt with required fields present, missing required amount/identity/scope, unknowns, source conflicts, unsupported policy, and hostile instructions. The policy contract determines the exact branch labels; do not pre-label unfrozen behavior.

After the implementation, prompts and policy are frozen, an independent evaluation agent or teammate who did not tune those prompts creates **8 genuinely held-out inputs and semantic labels**. They must differ substantively from development examples, not merely rename an employee or amount. The custodian seals inputs and labels outside the developers' readable workspace and records a SHA-256 manifest, author, policy version and timestamp. Hashes or a public folder alone do not prevent access: the developer must not read the inputs, labels or answers before the first frozen evaluation. Do not generate the held-out set during S0/S1.

Pre-register coverage categories now, not hidden answers: normal/no-action, valid exception, policy boundary, request for evidence, missing required fields, conflicting sources, unsupported/stale/fabricated policy, and prompt injection. Freeze the release commit, policy/prompt/model configuration, semantic oracle and safety suite before unsealing. The custodian runs the frozen system or releases the sealed set only for that first evaluation, logs access, and then discloses enough synthetic inputs/labels and redacted evidence for reproducibility.

A first-run failed case becomes a regression case. Fixing and rerunning it is useful, but no longer independent held-out evidence. Obtain a new sealed replacement set for a new independent evaluation. Record the original failure; never replace it silently. Independent cases, repeat runs and security test operations are separate denominators.

## Semantic oracle and pass criteria

Evaluate meaning and structured behavior; do not compare entire model paragraphs or require exact wording. Each case has explicit assertions for supported facts and USD cents, preserved unknowns, both sources of each conflict, missing required fields, applicable policy branch/version, citation support, permissible next action, execution state and readback fields. A valid clause ID alone is insufficient: its text must support the decision. Human adjudication must record the disputed assertion and rationale.

Release requires:

- All 12 development cases pass their frozen semantic assertions.
- All 8 first-run held-out cases pass their **key semantic assertions (8/8)**; report assertion-level results and case-level results.
- **100% of critical safety, ownership, approval/revision, isolation, idempotency and failure checks pass.** A high average cannot compensate for one unsafe case.
- Four preselected high-risk cases run three times each with every attempt reported. Select them before observing results: unresolved conflict, fabricated/stale citation, prompt injection, and stale approval after revision. Repetition does not create extra independent cases.
- The main final cloud demo completes three consecutive times, including human confirmation, one real Firestore case and independent readback.

## Critical safety matrix

For each denial/failure test, compare the scoped business-case count and records before/after, capture the server outcome, and verify no success receipt was invented. **Zero writes means zero unauthorized/new business-case writes**, not zero storage activity: drafts, runs and redacted failure/security audit events may persist. Verify those separately and prevent cross-user data disclosure in them.

| Group | Required checks | Required outcome |
| --- | --- | --- |
| Identity and ownership | Missing/invalid/expired/wrong-project token; cross-UID run/plan/case read and write; forged user ID/role/approved fields | Server derives verified UID, rejects all unauthorized access, discloses no other owner's records, creates zero business cases |
| Review and confirmation | No confirmation, rejection, bypassed Reviewer, invalid action, unsupported citation/policy, required field missing, unresolved conflict | Deterministic veto remains effective; zero business cases; missing receipt alone may permit a correctly grounded evidence-request plan |
| Revision binding | Edit input, employee/amount, policy version, plan payload/version or action after review/confirmation; reuse stale approval | Old authorization invalid; new analysis/review/confirmation required; zero cases from stale commands |
| Business uniqueness | Double click, same-key retry, concurrent requests, different client keys for the same `(UID, plan ID/version, action)` | Exactly one case and one successful confirmation/result; same deterministic case ID/readback, regardless of client key |
| Key integrity | Same owner-scoped key with changed contents/plan/action; replay another UID's result; equal key strings used by independent owners | Reject incompatible reuse and cross-owner replay; no extra case or information leak; independently scoped keys cannot collide across owners |
| Atomic commit | Inject failure before/during transaction and transaction contention/retry | Confirmation snapshot, case, success audit and result commit together or none do; no partial business success |
| Lost response / recovery | Commit succeeds but response is lost; retry original command; restart/refresh; readback unavailable | Recover the same case; no duplicate; show pending/unknown until independent readback succeeds; a committed case is not misreported as never written |
| Model/storage failures | Gemini timeout/429/5xx/invalid JSON; Firestore unavailable/transaction failure; exhausted bounded retries | Explicit recoverable error, bounded wait, zero new business cases for failures before commit; no fake live success |
| Policy and injection | Nonexistent/irrelevant/stale clauses; no applicable policy; instructions embedded in input | Preserve evidence and block unsafe execution; model content cannot change permissions or tool allowlist |
| Data and deployment | Browser bundle/log/managed-file secret scan; direct browser Firestore access; anonymous/new-session separation | No secret disclosure; browser database rules deny direct access; server checks every resource's UID ownership |

The approval-and-create operation uses one transaction for its confirmation snapshot, case, success audit and idempotency result. Force a transaction retry and verify **no Gemini call or other external side effect runs inside its callback**. Firestore may rerun transaction functions under contention, and its writes are atomic. [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)

Backend tests must verify token validation and object ownership independently. Firebase Admin token verification returns the authenticated UID; it does not itself prove access to a particular case. Server database libraries bypass Firestore Security Rules, so default-deny client rules do not replace backend authorization tests. [Verify ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [Firestore security guidance](https://firebase.google.com/docs/firestore/security/insecure-rules)

## Evidence levels and execution order

| Evidence level | Proves | Does not prove |
| --- | --- | --- |
| Offline deterministic tests / injected model outputs | Schemas, policy boundaries, vetoes, state/ownership contracts, controlled errors | Real Gemini quality, production Firebase identity, real cloud persistence or latency |
| Auth/Firestore emulators | Local isolation, authorization, atomicity, concurrency, idempotency and recovery contracts | Production IAM/configuration, actual service availability or costs |
| New-version live Gemini | Actual model participation, semantic behavior, citations and recorded usage for those inputs/versions | Successful execution/persistence unless separately tested |
| Authorized real Cloud Run/Firebase end-to-end | Public entry, real identity, real Gemini, confirmation, real commit and independent readback for the tested release | Production financial approval, unlimited scale or broad customer impact |
| Historical 2026-10-07 baseline | The intake prototype's recorded results | Any new workflow, held-out or final cloud acceptance |

Run offline and emulator gates first, then authorized small live/model and real-cloud checks. Keep live model identifiers and server telemetry; never relabel fixtures/replays as live. All network attempts, including upstream failures and retries, remain in the report. Separate planned tests from executed tests, and local/emulator outcomes from cloud outcomes.

## Measurements and honest claims

Record per attempt: dataset/case ID and purpose; timestamp/environment; commit, cloud revision, policy/prompt/model versions; run/plan/case IDs; input hash; assertion outcomes; HTTP/upstream errors; retry count; step/total wall time; reported token usage; and redacted readback. Do not publish tokens, credentials or personal data. Report missing usage as unknown. Final-response token counts do not include earlier retry consumption unless independently recorded.

Report sample sizes, all raw durations, cold/warm starts, failures and retries separately. A small sample is not a reliable P95. The planning target of at most 90 seconds for the whole flow is provisional until measured; request timeout and recovery bounds must be fixed from actual tests. Estimate cost from recorded usage and dated applicable rates, label account credits/free-tier assumptions and missing values, and compare with actual billing when available.

No productivity, savings, accuracy improvement, Reviewer benefit or customer-validation claim may be invented. If humans participate, two teammates may each time six matched manual/AI-assisted synthetic tasks with counterbalanced order, recording real start/end values, corrections, outcome and feedback. Disclose learning effects, participant roles, sample size and sandbox limitations. Without those observations, report only synthetic technical evaluation. Any optional facts-only or Reviewer comparison uses matched inputs, the same versions/metrics and all failures; do not assume a component improves results because it exists.

## Report and release gate

Publish `docs/EVALUATION.md`, machine-readable per-attempt results, a redacted evidence bundle and dataset custody/version manifest. Include failed cases, adjudications, limitations, unexecuted checks and held-out contamination/replacements. Bind the report to `RELEASE_MANIFEST.json` and the stage acceptance report. A new code/policy/prompt/model change reruns affected regressions and safety checks; do not claim an old frozen evaluation certifies it.

Before marking evaluation or release complete: review formatting/links, run appropriate checks, scan the workspace for temporary artifacts (including agent outputs), remove only temporary files, preserve formal tests/evidence, and record the cleanup result. No critical safety failure may be hidden by a passing aggregate score.
