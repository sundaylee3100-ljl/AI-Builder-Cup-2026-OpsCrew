# OpsCrew cloud teammate handoff

## October 12 review update

Read [current PR #4 code review](acceptance/PR04-code-review-2026-10-12.md) and [corrected cloud usage report](DEPLOYMENT_AND_USAGE_REPORT.md) before using the earlier instructions below. Teammate-authored cloud summaries are preserved as historical partial evidence; they do not bind the final reviewed source to a currently verified image/revision. Do not return public traffic to an older revision that bypasses trusted identity or persistent admission. The actual saved-case G3 and full operational G4 still require fresh evidence.

The maintained real-resource runner is `scripts/check-g3-real.mjs`. It requires explicit `--live`, a real Firebase project and separate public Web key in the process environment, and for local-server mode an authorized model key and no emulator routing. For a private Cloud Run service, supply `OPSCREW_CLOUD_RUN_ID_TOKEN` in memory; the runner uses it only in `X-Serverless-Authorization`, with the visitor token separately in `Authorization`. Private success does not prove signed-out public entry. Complete human account/budget authorization before any real run; this review ran only injected offline tests.

From the application directory, an example for an already authorized public endpoint is:

```powershell
# Set the approved real Firebase process environment first; do not print tokens/keys.
node --import tsx scripts/check-g3-real.mjs --live --base-url https://opscrew-883881551915.us-central1.run.app --output CLOUD-G3-NEW.json
```

Choose a new JSON **basename**, with no directory component. The runner reserves the report exclusively under `docs/acceptance` before any identity/model/write request, checkpoints each request, and preserves failures/unknown write results with original recovery identifiers. Do not change the original command or treat an unknown result as a safe retry. One workflow can consume up to six provider attempts and creates real synthetic data plus anonymous identities; it is not one provider call. The runner does not automatically certify all G3/G4 scenarios or independent G5.

Prepared 2026-10-11. Owner A maintains reviewed application/provenance, synthetic policy, local acceptance and submission material. Teammate B owns approved Google Cloud/Firebase setup, image build, deployment and actual resource testing. Both review final evidence before submission. The owner assigned cloud operations to the teammate after local preparation; account/resource operations are outside the local completion claim.

## Starting inputs

Use the accepted pre-cloud commit on GitHub main, or its reviewed PR before merger, and compare its SHA to the acceptance record. Read [deployment instructions](PRECLOUD_DEPLOYMENT.md), [S3 replay semantics](S3_CONFIRMATION_CASES.md), [policy/contracts](POLICY_AND_CONTRACTS.md), and the submission checklist. Historical S2 Gemini and S3 emulator evidence is not a new deployed test; preserve it and create new cloud reports.

Before an initial model evaluation, read [independent evaluation and custody](PRECLOUD_EVALUATION.md). Freeze the actual source/model first. The eight hidden inputs and labels must be created and sealed on the custodian's independent machine, outside the implementation agents' access; do not send them here for setup. Public development smoke is separate from that first-run independent claim.

| Owner/operator input | Destination |
| --- | --- |
| Approved Cloud/Firebase project, billing/credits, region and database location | Reviewed console configuration and release record |
| Runtime/builder identities, image repository and private build bucket | `deploy/cloud-release.local.json` public fields |
| Firebase Web `apiKey`, `authDomain`, `appId` | Public runtime Web config restricted to Firebase APIs |
| Gemini Developer API key | Secret Manager only; numeric version in configuration |
| Actual source SHA, build ID, image digest, ready revision and URL | New cloud acceptance evidence |

AI Studio browser login/Gemini access does not grant Cloud CLI/Firebase Admin/deploy permissions. The operator manually completes login/consent/billing interactions. Save no tokens, private keys, credential JSON, secret values, authorization headers, or personal financial data in reports.

## Work order and review

| Order | Teammate B executes | Owner A reviews | Evidence |
| --- | --- | --- | --- |
| 1 | Inspect/select approved project, costs, identities, region/database | Actual approved scope; no accidental new project/billing plan | Nonsecret configuration review |
| 2 | Enable Anonymous provider; Web registration; default Firestore; deny-all rules and indexes | Separate Web/model keys; scoped Admin roles | Actual token verification, ready indexes and direct-client denial |
| 3 | Pull accepted source and reproduce local commands; validate release JSON | SHA/lock match; formal tests; no credential image context | Local reproduction and versions |
| 4 | Build Linux image and deploy digest-pinned private Cloud Run | Identities, pinned secret, min0/max1, quotas and readiness | Build ID, base/image digests, revision, endpoint and IAM |
| 5 | Execute real-resource scenarios below | Independent readback, isolation, failures, persistent quotas and cost | Real G3/G4 evidence with all failures retained |
| 6 | Independently run the eight sealed cases; four high-risk categories three times; main demo three consecutive times | Custody, semantic labels, 100% critical safety, all first attempts and failures | G5 independent evaluation and repeat evidence |
| 7 | Rehearse pause/restore and rollback to an accepted prior revision | Schema/secret compatibility and one-case recovery | G4 exact revisions, time and drill result |
| 8 | Publish approved judge frontend and test signed-out access; capture final English video/screens | Actual URL and claims; understandable confirmation | G6 final endpoint, PDF/editable deck, video and frozen release |
| 9 | Captain submits the final portal entry after joint review | Actual Submitted state, submission ID/time, link availability and maintenance owner | G7 submitted receipt; preparation alone is insufficient |

Offline provider/emulator reports cannot pass orders 4–7. Health/readiness alone cannot pass order 5.

## Real-resource scenario checklist

Use only synthetic USD examples. Begin with one workflow while monitoring the actual model/project quota and cost. For private direct requests use Cloud Run's token in `X-Serverless-Authorization` and Firebase's token in `Authorization`. Use separate browser profiles/private windows for visitors A and B. Do not export browser logs containing credentials.

| Scenario | Test method | Required result |
| --- | --- | --- |
| Static release/readiness | Root, built asset, nested refresh, health/config/readiness | Same app/backend; real Firestore mode; readiness `model_calls:0`; no secret exposure |
| Auth | Explicit visitor session; absent/expired/wrong-project token | Valid token works; invalid/forged owner denied before model admission or case mutation |
| Real workflow | DEV-01, DEV-04, DEV-10; actual model output and every attempt retained | Correct facts/policy/plan/review or safe failure; actual model telemetry; blocked/failed plans cannot commit |
| Human confirmation | Inspect version/digests/expiry; checkbox off, then consent | No case before consent; one exception transaction afterward; no reimbursement approval/payment |
| Independent readback/history | Separate case GET; refresh and open owned history | Same real case/approval; verified UI only after readback; indexes support both history queries |
| Visitor isolation | B requests A's known run/case, prepare and confirm | A's data unavailable to B; no cross-owner effects |
| Replay and stale input | Replay committed command; change input after preparation and try old binding | One business case; uncommitted old binding refused; committed read-only recovery available |
| Unknown create response | Discard an authorized create response after it finishes; recover the original command | Same saved case independently verified; no second case; absent-at-read is not a definitive failure |
| Direct Firestore access | Anonymous and visitor-token REST read/write of synthetic record | Both denied; Admin server routes remain usable |
| Model limits | One real admitted run; small same-visitor parallel pair; offline suite for destructive daily caps | One owner lease, clear 429, persistent counters after restart; no paid stress run |
| Pause/restore | Kill-switch revision with liveness probe, old-case GET, re-enable readiness | No new Gemini calls; old case readable; restored revision ready |
| Failure/cold start | Actual provider timeout/429/402, one cold start/restart; deliberate retry | Actual errors retained; no fake fallback; budget/recovery semantics preserved |
| Judge path | Approved public release, signed-out desktop/mobile browser | Page accessible without team login; business API protected; readable workflow/confirm/readback |

Defaults are deliberately small. Do not run the whole fault matrix against paid resources, reset real quota documents to force spending, or disable global limits for a demo. UTC daily quota resets at 08:00 Asia/Shanghai. Record UTC and local release times. Resolved failures/reruns remain separate entries.

## Evidence handback and submission

Create new `docs/acceptance/CLOUD-...-<timestamp>.json/md` reports with actual source SHA, lock hash, image digest, build ID, revision, runtime identity, project/region, secret name/numeric version, URL, rules/index status and outcomes. Each live attempt records fixture/run ID, actual returned model version, statuses, duration and token counts if provided. Successful-case evidence includes synthetic case/approval IDs and the independent GET result. Sanitize provider errors; screenshots/video must avoid keys and account panels.

Owner A updates final claims/deck/video from those reports. G3/G4 pass only for executed real-resource scenarios. G5 requires independent held-out 8/8, 100% critical safety, four high-risk categories ×3 and three consecutive full main-demo runs. G6 requires the final frozen English materials, PDF/editable deck, public video under 180 seconds and anonymously accessible final links. G7 requires the actual portal Submitted receipt/ID/time. These are separate gates. Recheck current [official rules](https://aibuildercup.com/index.html); the use case aligns with Future of Work and Enterprise Productivity on the [official themes page](https://aibuildercup.com/themes.html).

If access/deployment/provider availability blocks a step, record its exact gate and have the authorized owner resolve it. Preserve locally accepted source; an emulator preview cannot substitute for deployed evidence.


The resource acceptance CLI imports TypeScript browser/domain modules and requires the installed tsx loader. Use a full checkout with development dependencies, Node 24 and node --import tsx as shown above. The native production application itself does not require this development loader. Choose a fresh evidence filename before authorizing identities/model calls/writes.
