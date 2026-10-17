# OpsCrew cloud deployment and usage review

October 17 publication update: **the owner confirms competition submission is complete.** The accepted 3:30.66 video is distributed through https://youtu.be/rdbS1XUNUjw; its local MP4 is excluded from GitHub. Current fields select the separate October 17 proposal. See [owner confirmation](acceptance/SUBMISSION-owner-confirmation-2026-10-17.json) and [material index](../submission/SUBMISSION_FORM.md). Portal receipt/inspection and complete anonymous playback are not independently verified. Engineering and cloud observations in this dated report remain historical; this documentation change does not require redeployment.

Reviewed October 12, 2026 (Asia/Shanghai). Teammate source reviewed through `7fb9e03ed21c8e6a3eb01e5be2574ccec3dfae9a`, including the earlier `6091ed3868bcb1d889a82e3b4b700497c1154058`; previous precloud review head: `8793865657a5566e0ed34b31dac13a84d60ab88c`. Record subsequent review corrections and the final accepted Git SHA separately.

This report corrects the earlier guide against the application and retained evidence. OpsCrew plans synthetic USD expense exceptions with Gemini FACTS, deterministic POLICY, PLANNER and a separately prompted REVIEWER. A current eligible recommendation requires explicit human confirmation before one owned exception case is saved and independently read back. It never approves reimbursement or payment.

## 1. Deployment evidence and limits

The teammate reported [this public Cloud Run endpoint](https://opscrew-883881551915.us-central1.run.app). The reviewer's read-only root, health, config and readiness requests obtained no HTTP response through the local network path. This means current service state could not be verified from this machine; it does not establish that the service is down or returns 503. No model call, login or business write was made. See the [read-only review record](acceptance/PR04-cloud-readonly-review-2026-10-12.json).

All deployment values below are **teammate-reported historical metadata**. Current IAM, traffic, image provenance, resource limits, Secret Manager bindings and Firebase state were not independently verified. The reported image cannot be assumed to contain the reviewed source.

| Reported item | Historical value | Verification boundary |
| --- | --- | --- |
| Project / region | `project-b2db87f6-7a4e-4020-972` / `us-central1` | Operator-selected; not asserted to be contest-mandated |
| Service / reported active revision | `opscrew` / `opscrew-00003-h5s` | Previously reported as 100% traffic; current traffic unverified |
| Later reported active revision | `opscrew-00004-mtz` | The October 12 teammate report claims 100% traffic, Firestore mode and a successful readiness response; current control-plane state and source/image binding were not independently verified |
| Earlier tested revisions | `opscrew-00001-pz4`, `opscrew-00002-mqc` | Historical plan-only tests; not accepted rollback targets |
| Cloud Build ID | `e0c6a257-182c-48f1-a103-2457ed0cd65b` | Build success and source-to-image binding unverified here |
| Image digest | `sha256:7d9fc94cb6babefacd7787b19f96138010103c92aed8fdacc87e064d9d4a1d45` | Reported artifact in the project's `cloud-run-source-deploy/opscrew` repository; no independently verified source SHA |
| Runtime / resources | Node 24; min instances 0; max instances 1; concurrency 4; CPU 1; memory 512 MiB; platform timeout 120 seconds | Reported settings, not a current console export or spending guarantee |
| Default model | `gemini-3.1-flash-lite` | Historical requested model ID; actual returned provider model version not established by these summaries |
| Secret | `gemini-api-key:latest` | Reported mutable alias; not an immutable numeric-version binding |
| Firebase business backend | Earlier reports left case creation pending; the October 12 report claims a six-step real Auth/workflow/confirmation/create/readback/history chain | No new immutable response/attempt journal accompanies that claim; owner isolation, idempotent retries, rules/indexes, IAM and the exact deployed source remain unverified by this review |

## 2. Retained test evidence

Historical reports are preserved without rewriting outcomes. They are teammate-authored summaries, not independent executions by this reviewer.

| Evidence | Recorded result | Limit of the claim |
| --- | --- | --- |
| [G4 single-workflow summary](acceptance/G4-cloud-workflow-live-2026-10-11.json) | One public EVIDENCE_REQUEST plan/review attempt; review PASS; execution unauthorized; three role steps total 4,144 reported tokens | `real_gemini_calls: 1` uses a workflow-level count despite three role steps. Exact provider attempts, returned model version, source/image binding and saved-case chain are not established |
| [G4 public acceptance summary](acceptance/G4-public-acceptance-2026-10-11.json) | Initial five branches pass; S04 has two Reviewer contract errors. After the prompt repair at `71ed689`, S04 and S05 are reported passing; S05 includes a FACTS 503 and retry. Reports 11 negative checks, browser checks and a health-only traffic drill | The final 6/6 combines results across revisions; no full six-case rerun on one final revision is recorded. The reported 11 real calls lack a full role/attempt journal and clear counting definition. Full G3/G4 and independent G5 are not passed |
| [Night emulator report](acceptance/S03-emulator-validation-2026-10-10-night-verify.json) | 25/25 groups at clean `51fd83207c4026a5c8760305f3a6c43f08632eb4`; injected public fixtures; zero real Gemini calls and zero production Firebase writes | Historical S3 evidence, not current 27-group acceptance or real-cloud verification |
| [Prior precloud acceptance](acceptance/PRECLOUD-readiness-2026-10-11.md) | Source-bound preparation: 216 offline tests, 27 emulator groups and 350 offline assertions | Binds the previous snapshot. Changed runtime code needs fresh review checks; public fixtures and offline assertions are not independent held-out tests |
| October 12 teammate report in commits `9cb9c53` and `ce77d83` | Reports active revision `opscrew-00004-mtz` and successful anonymous signup, workflow, confirmation, case create, independent GET and history | Retained as a teammate-reported result, not discarded. No newly saved full response journal, case/run identifiers, idempotency replay, all failed attempts or accepted-source/image attestation was added. The illustrative commands do not establish a reproduced full G3/G4 pass |

At the reviewed source, prompt versions are FACTS `opscrew-facts-1.1.0`, PLANNER `opscrew-planner-1.0.1` and REVIEWER `opscrew-reviewer-1.0.1`; policy is `synthetic-expense-usd-1.0.0`. Preserve earlier failures and record fresh dated results for each newly accepted release.

## 3. Requirements for a working cloud demo

Follow the [cloud handoff](CLOUD_TEAMMATE_HANDOFF.md) and [deployment instructions](PRECLOUD_DEPLOYMENT.md). Firebase terms acceptance may be necessary for the authorized operator; it does not by itself configure all services.

1. Verify the approved project, billing/credits, runtime identity and resource scope. Record accepted Git SHA, lockfile identity, build ID, image digest, numeric secret version and actual revision.
2. Configure Firebase Web registration, Anonymous Auth, default Firestore, deny-all direct-client rules and required indexes. Use `OPSCREW_FIREBASE_MODE=firestore`, public Firebase Web settings and scoped Admin permissions. The public Web key must be separate from the server Gemini secret.
3. Deploy reviewed production code with persistent shared admission. Verify visitor-token validation and Firestore access, then execute the real-resource checklist. An older public release allowing unauthenticated calls or bypassing persistent quotas is not an accepted demo fallback.
4. After accepted resource tests, approve judge-facing public access and verify signed-out desktop/mobile behavior. Business APIs still require trusted visitor identity.

`/api/health` is liveness. `/api/ready` checks model configuration, trusted-identity/storage configuration and a bounded Firestore read, with zero model calls. Readiness does not prove Auth IAM, Gemini access, indexes or complete case acceptance. Production rejects missing trusted identity or persistent Firestore admission before model processing; when the backend is configured, token validation can reject missing or invalid visitor tokens before that guard.

## 4. Usage after the approved backend is ready

The following is the intended UI flow, not a claim that the current endpoint passed it. Use synthetic data only.

1. Select `Start visitor session`. Use separate browser profiles for owner-isolation tests; anonymous ownership belongs to the browser session.
2. Select a preset or enter consistent USD facts. Keep `gemini-3.1-flash-lite` for the reviewed model release unless making a separately recorded release.
3. Select `Analyze, plan & review`. Inspect extracted facts, deterministic decision, original policy citations, plan and separate review. BLOCKED, NEEDS_INFO and NO_ACTION_REQUIRED cannot create cases.
4. For a current eligible plan with passing review, select `Prepare human confirmation`. Inspect owner, versions, digests and expiry; the authorization checkbox starts unchecked.
5. Explicitly check authorization, then select `Confirm & create synthetic case`. Verified success requires independent case readback and never represents reimbursement approval or payment.
6. Select `Refresh history`, then `Open & verify case`. Reload and verify persistence. After a lost write response, select `Recover previous submission` using the existing command; do not invent a new idempotency key for an unknown result.

The six UI presets are labeled `Synthetic 01` through `Synthetic 06`; these labels are distinct from public DEV fixture identifiers.

| Public fixture | Actual checked-in input | Expected branch / case behavior |
| --- | --- | --- |
| DEV-01 | USD 148.50; receipt available; known employee; consistent facts | NO_ACTION_REQUIRED; no case |
| DEV-04 | USD 38.00; receipt missing; known employee; consistent facts | EVIDENCE_REQUEST; case after passing review and explicit confirmation |
| DEV-10 | Form USD 38.00 versus narrative USD 50.00; receipt missing | BLOCKED; no case |

Read the [exact public fixtures](../aistudio-export-2026-10-07/fixtures/development-cases.json). These are development examples, not blind-test data.

## 5. API contract

These checks make no model call or business write. They are examples, not claimed successful outputs:

```bash
curl --fail-with-body https://opscrew-883881551915.us-central1.run.app/api/health
curl --fail-with-body https://opscrew-883881551915.us-central1.run.app/api/config
curl --fail-with-body https://opscrew-883881551915.us-central1.run.app/api/ready
```

A private release also needs Cloud Run IAM authorization. Keep its token in `X-Serverless-Authorization` and the distinct Firebase visitor token in `Authorization`. Never include either token in reports or screenshots.

Current source response structure:

- `/api/health`: `ok`, `service`, `stage`, `case_backend_mode`; no timestamp field.
- `/api/config`: default/allowed model IDs, timeout/attempt settings, `api_key_configured`, `case_backend`, `policy_version`, `model_enabled` and `model_admission`. Public Firebase configuration is under `case_backend.firebase` when enabled. The server-key field is only a boolean, never the Gemini key value.
- `/api/ready`: success includes `ready: true`, backend mode and `model_calls: 0`; failures return safe errors. Do not infer readiness from health.

The allowlist is `gemini-3.8-flash`, `gemini-3.1-flash-lite` and `gemini-flash-latest`. Default remains `gemini-3.1-flash-lite`. An allowed ID does not independently prove project availability or a returned provider version.

`POST /api/workflow` accepts a flat request. This illustrative DEV-04 body was not executed by this report:

```json
{
  "description": "[SYNTHETIC] Parking fee $38.00 for SYNTH-EMP-100. Receipt lost.",
  "amount_usd": "38.00",
  "receipt_status": "missing",
  "employee_identifier": "SYNTH-EMP-100",
  "model_id": "gemini-3.1-flash-lite",
  "input_version": 1
}
```

Execute only after authorized budget review and with a valid visitor token. `input_version` must be a positive safe integer. Receipt status is `available`, `missing` or `unknown`; unknown amount can be an empty string and unknown employee can be null. `/api/analyze` accepts the same intake fields except `input_version`, performing facts analysis rather than the full plan/review workflow. Nested `expense`, `amount`, `category`, `receipt_attached` and `employee_id` are unsupported. The strict whitelist enforces description length 4,000 and employee identifier length 80.

## 6. Actual deterministic policy

This summarizes `synthetic-expense-usd-1.0.0`. Exact citation text in [policy source](../aistudio-export-2026-10-07/src/domain/policy.ts) and [policy/contracts](POLICY_AND_CONTRACTS.md) is authoritative.

| Clause | Actual rule |
| --- | --- |
| SYN-001 | Synthetic USD scope; nonnegative safe integer cents; unsupported currency or invalid contract values rejected |
| SYN-002 | A case requires known amount, employee and receipt status; unknown required facts require clarification. Description and extra free-text missing-information notes are not mandatory case fields |
| SYN-003 | Any unresolved contradiction blocks creation; preserve conflicting sources without choosing a winner |
| SYN-004 | A missing receipt with otherwise known, consistent facts permits EVIDENCE_REQUEST; request an itemized receipt or explanation |
| SYN-005 | Amount strictly greater than USD 200 requires MANUAL_REVIEW; exactly USD 200 does not cross the threshold. Missing receipt also becomes an evidence requirement |
| SYN-006 | Known consistent facts, available receipt and amount at most USD 200 require NO_ACTION_REQUIRED and no case |
| SYN-007 | Only `create_exception_case` in the synthetic sandbox, after owner/version/rule checks and explicit human confirmation. Never reimbursement approval or payment |
| SYN-008 | Exact clause ID/version/original-text citations; changed bindings invalidate prior review/approval; embedded instructions remain untrusted data |

The code contains no USD 500 review threshold, USD 25 receipt threshold, advance reconciliation, personal-spend split, currency-conversion action or prohibited-category rule. The earlier guide's claims were incorrect. A synthetic employee identifier is an expense fact and does not have to equal the Firebase owner UID.

## 7. Limits, costs, secrets and recovery

USD 40 was a reported budget goal. No independently verified billing export or configured spending cap establishes it as a hard ceiling. Instance limits, quotas and deadlines reduce exposure but do not guarantee total costs. Alerts-only budgets do not automatically stop billing; verify any service-supported spending cap separately. See [Google Cloud budget documentation](https://docs.cloud.google.com/billing/docs/how-to/budgets).

Source defaults reserve up to six provider attempts per complete workflow: global concurrency 2, visitor concurrency 1, global 6 runs/minute and 60/day, visitor 2/minute and 12/day. Firestore counters persist across instances and reset on UTC calendar days. Failed, cancelled and unknown usage is not refunded. These are source defaults, not independently observed settings of the deployed revision. Infrastructure concurrency 4 is different from model admission concurrency.

A full HTTP workflow is bounded to 90 seconds; fact analysis has a 45-second route bound and a 40-second SDK call bound. Planning roles have 30-second call bounds within the shared workflow budget. The reported 120-second platform timeout does not replace these limits.

Store the Gemini key server-side in Secret Manager, using an approved numeric version recorded with the accepted image/revision. `latest` is mutable and is not pinned. Authorized operators must verify actual configuration and access; this review does not certify image layers or all cloud bindings. See [Cloud Run secret configuration](https://docs.cloud.google.com/run/docs/configuring/services/secrets).

The correct pause flag is `OPSCREW_MODEL_ENABLED=false`, not `MODEL_ENABLED=false`. Use the reviewed release procedure for an authorized pause drill in a new revision, retaining all other settings. Pausing makes new-model readiness fail while owned case readback should remain available; use the documented liveness startup probe for the drill. Record actual pause/restore revisions and observations. Restore `OPSCREW_MODEL_ENABLED=true` only after review. This report performs no cloud update.

Rollback targets must have accepted compatible schema, numeric secret binding, trusted Auth and persistent shared quotas. Historical `00001`/`00002` public plan-only releases are not recommended fallback targets. A health-only traffic drill does not establish full workflow recovery.

## 8. Remaining delivery gates

G1 through G7 are team engineering gates, not asserted official contest rules. Official submission requirements are in the [submission checklist](../SUBMISSION_CHECKLIST.md).

| Team gate | Evidence boundary | Remaining acceptance |
| --- | --- | --- |
| G1 engineering | Prior source-bound checks; current changes under review | Fresh appropriate checks for final accepted SHA |
| G2 policy/model | Versioned policy/prompts and teammate-reported historical planning | Final source, requested/returned model and complete bounded attempt records |
| G3 real resources | PARTIAL teammate-reported six-step chain; emulators are not production evidence | Source-bound responses and identifiers, real Auth isolation, confirmation, idempotency, independent GET/history, client denial, rules/indexes and failures |
| G4 cloud operations | PARTIAL historical teammate summaries; current deployment unverified | Source/image/revision/secret binding, ready release, persistent limits, cold start, pause/restore and accepted rollback |
| G5 independent evaluation | PENDING; 350 prior offline assertions and public DEV examples are not hidden tests | Independently sealed eight cases; four risk categories with three repeats; three consecutive full main-demo runs; all failures retained |
| G6 final materials | PENDING; previous short recordings/proposals are historical; new video and paired publication require acceptance | October 16 correction: verified names/product/video links, 3–4 minute recorded demonstration matching the portal, natural narration and final review |
| G7 submission | Submitted, explicitly owner-reported on October 17; receipt not supplied | Owner confirmation is recorded separately; no receipt ID, exact time or independent portal inspection is fabricated |

For new cloud tests, record accepted Git SHA, lock hash, build ID, image digest, revision, runtime identity, project/region, numeric secret version and nonsecret outcomes. Retain full model-attempt telemetry when available, every first failure and rerun, and independent readback for saved-case claims. Do not export credentials or relabel public development examples as hidden tests.

An [HTML reading copy](DEPLOYMENT_AND_USAGE_REPORT.html) contains the same report. Historical JSON remains unchanged; newly executed release acceptance belongs in new dated evidence files.

## 9. October 12 build integration

The teammate's latest build change replaces the deprecated `__dirname` alias with an ESM-compatible root and splits React/Firebase/icon dependencies into vendor chunks. The reviewer observed a successful Vite 8.3.3 build of 1,677 modules in 2.91 seconds with no warnings: the application entry is 79.28 kB, alongside separately loaded vendor/runtime chunks. This is a local observation, not a cloud build timing or a claim that the total shipped code is only 79.28 kB. Function-style `manualChunks` and `rollupOptions` remain compatible in Vite 8 but are deprecated; future migration is separate from the current accepted build.

Both production smoke tools retain Node 24, matching the package engines, `.node-version` and Docker contract. The proposed `>=22` guard also admitted early Node 22 and other unvalidated majors, so it was not accepted as a claim of runtime compatibility. The maintained production check now verifies every emitted JavaScript chunk, including split dependencies. See the [integration review](acceptance/PR04-code-review-2026-10-12.md) for actual fresh checks and their source binding. No production traffic, runtime identity, billing or cloud resource was changed by this integration.
