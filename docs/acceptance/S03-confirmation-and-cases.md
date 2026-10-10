# S03 acceptance: human confirmation and cases

Stage: S3. Prepared on 2026-10-10 (Asia/Shanghai). Status: **local acceptance passed**: the frozen Auth/Firestore emulator release passed **25/25 check groups**, the offline suite passed **173/173 tests**, and lint, build, production smoke and the scoped browser checks passed. **G3 is pending** because the required real-resource check has not run. No production Firebase identity, production Firestore write/readback or cloud deployment is claimed by this report.

## Scope and evidence levels

The single action is `create_exception_case` for a synthetic evidence-request or manual-review case. Confirmation authorizes record creation and does not approve a payment. Google AI Studio Build origin and real Gemini participation remain documented in [provenance](../../PROVENANCE.md) and [S02 acceptance](S02-plan-and-review.md). S3 local code changes and injected model outputs are labeled explicitly.

| Check | Method | Current outcome |
| --- | --- | --- |
| Verified identity and owner isolation | Genuine local Auth emulator tokens for two users; wrong/missing/expired tokens and cross-owner resource operations | PASS in initial emulator checkpoint |
| Reviewable plan and explicit confirmation | Inspect final case fields; missing confirmation, rejected plan, invalid state and bypassed review | PASS in initial emulator checkpoint |
| Version, digest, policy and action binding | Alter current run/plan bindings and command fields; invalidate edited input | PASS in initial emulator checkpoint |
| Business uniqueness | Ten concurrent requests with same/different keys and two independently prepared intents | PASS: one case, approval and success audit |
| Key integrity | Changed command with same owner-scoped key; equal keys in independent owners | PASS in initial emulator checkpoint |
| Atomic persistence and audit | Abort after buffered writes; force actual Firestore callback retry with ABORTED | PASS: zero partial commit; retry committed one result |
| Independent readback and recovery | Discard committed response; retry, read back, restart HTTP service with a new service object; inject readback outage; read-only recovery after edit/expiry | PASS in expanded emulator checkpoint |
| Browser database boundary | Authenticated and anonymous direct REST client read/write denied by emulator rules | PASS: two reads and two writes denied |
| Offline regressions, lint and build | Locked local dependency suite and production build | 173/173 offline tests, lint, production build and 8/8 production HTTP checks PASS |
| UI acceptance | Fixed built frontend, genuine emulator session, matching injected fixture; confirmation/readback, reload/history, desktop/mobile and keyboard focus | PASS within the browser scope below; unknown-commit recovery tested by emulator/client suites |
| Real-resource G3 | Authorized real identity, real Gemini workflow, confirmation, Firestore transaction and separate readback | **Pending: resource configuration and authorized execution** |

## Executed initial checkpoint

[The immutable initial report](S03-emulator-validation-2026-10-10-initial.json) ran from `2026-10-10T04:00:26.035Z` to `2026-10-10T04:00:49.448Z` (23.413 seconds). It recorded 23 passing check groups and zero failed groups, 39 injected fixture-provider calls, zero real Gemini calls and zero production Firebase writes. Local persisted totals were four cases, four approvals, six audit events and twelve idempotency results in an isolated test namespace. Two audit events describe explicit rejection/invalidation and do not represent business success.

The concurrent group sent ten commands, including two independently prepared intents. It produced one case, one approval, one `CASE_CREATED` audit and nine owner-scoped idempotency results; all case IDs matched. Transaction retry ran the Firestore callback twice and created one business result with no model calls inside the callback. The lost-response simulation deliberately discarded a create response in the test client; it is not evidence of a real public-network outage. The restart check replaced both the HTTP server and service object while preserving emulator data; it does not claim a browser refresh or cloud-service restart was tested.

The SDK emitted a metadata lookup timeout warning in the emulator environment. The assertions still passed; this was not a Gemini request, paid resource creation or real-resource acceptance. The initial report remains unchanged. Independent review subsequently identified cancellation-completion and edit-recovery edge cases; those fixes require their own final checks and do not retroactively alter the historical checkpoint.

## Expanded checkpoint and release binding

[The expanded checkpoint](S03-emulator-validation-2026-10-10-final.json) ran from `2026-10-10T04:14:10.209Z` to `2026-10-10T04:14:31.846Z` (21.637 seconds), with 25 passing groups and zero failed groups. It again recorded 39 injected provider calls and four durable local cases. The added read-only recovery groups proved that an uncommitted command returns `CASE_NOT_COMMITTED` without writes, and that an already committed case remains recoverable after expiry and a newer input. Cross-owner recovery was denied. Case, approval, audit and idempotency counts remained unchanged during both read-only checks.

The runner's source-fingerprint list was expanded during that execution to include the dependency manifest and lockfile. The expanded report remains historical evidence; neither earlier report is relabeled as certifying a later source change.

[The frozen release report](S03-emulator-validation-2026-10-10-release.json) ran from `2026-10-10T04:21:27.203Z` to `2026-10-10T04:21:41.725Z` (14.522 seconds): 25 groups passed, zero failed, 39 injected provider calls, zero real Gemini calls and zero production Firebase writes. It records SHA-256 for twelve source/configuration/dependency files. Its recorded Git revision is the pre-S3 commit c967803 with a dirty working tree; the fingerprints bind the tested uncommitted source, not a nonexistent release commit. All twelve fingerprints matched the source before the final staged format check. That check found one trailing ASCII space in runner line 241; removing it left every normalized line unchanged and passed the Node syntax check. The [delivery source binding](S03-delivery-source-binding-2026-10-10.json) records eleven unchanged fingerprints, the runner before/after hashes and the immutable release-report hash. This format-only correction does not claim a new execution of the prior tests. Historical reports are preserved without edits.

The root integration run reported 173/173 offline tests passed in 35,981.6149 ms with zero failures or skips, and TypeScript lint passed. The separate Firebase security suite contributed eight checks for disabled/misconfigured storage, emulator routing, unsigned-token rejection and model-secret protection in public web configuration. Production dependencies reported zero audit findings after the `@grpc/grpc-js` 1.14.6 override. Development tooling retains twelve findings (seven high, five moderate); the stage does not claim a clean all-dependency audit, and no forced dependency upgrade was applied.

The final frontend build used Vite 8.3.3, transformed 1,677 modules and completed in 4.23 seconds. The existing config-loader advisory about `__dirname` is non-blocking and remains visible. The production smoke passed eight HTTP checks in 8,919 ms, using the native Node server and disabled Firebase/model credentials. These checks establish packaging and safe disabled behavior, not database or model readiness. Dependencies were installed from the updated manifest/lockfile; a separate clean-machine S3 installation is not claimed.

## Browser checks and teammate acceptance

The browser used a fixed production bundle on an owned loopback server, injected development-fixture model outputs and genuine local Firebase Auth/Firestore emulators. The observed provider ID was `offline-browser-fixture`; no live Gemini request is claimed. The accepted input matched DEV-04 exactly: `[SYNTHETIC] Parking fee $38.00 for SYNTH-EMP-100. Receipt lost.`, USD 38.00, receipt missing, employee SYNTH-EMP-100. An earlier different preset mismatched that fixed provider and returned a safe 422 twice. Development hot reload reset volatile input during exploratory checks; final UI acceptance therefore used the fixed built bundle. Those exploratory results are not relabeled as successful model runs.

| Task | Test method | Expected and observed result |
| --- | --- | --- |
| Start visitor and review | Explicitly start a visitor session, run the matching fixture, inspect the passing plan and binding | Owned current plan; preparing confirmation creates no case; ten-minute expiry and digests shown |
| Explicit confirmation | Inspect create control, then select the confirmation checkbox and submit | Disabled before checkbox; one synthetic case created after explicit action |
| Verify persistence | Observe a separate case GET after create | Verified receipt shows the saved case, actual approval, run/plan/version, USD 38.00 and EVIDENCE_REQUEST |
| Restore history | Reload, confirm same tab-session UID, refresh history, open and verify the saved case | Same case ID verified through another read; current unsaved plan is cleared |
| Narrow viewport and keyboard | At 390 × 844, compare document client/scroll width; keyboard focus the session control | Both widths 375 px, no horizontal overflow; visible focus ring |

The verified browser case was `case_64bac9d2a5d0e25e129e716093a6c42f40286cfda3c3bbc8d893b5dc7619e54f`, created at `2026-10-10T04:19:43.417Z`. It is a synthetic local-emulator record, separate from the automated runner's isolated namespace. [Desktop proof](S03-emulator-ui-desktop-2026-10-10.png) and [mobile/focus proof](S03-emulator-ui-mobile-2026-10-10.png) preserve the result. The mobile screenshot shows a viewport portion of the receipt, not its entire contents.

Browser refresh of an already committed history record was tested. Browser refresh during an unknown commit, browser rejection and every edit/cancel race were not independently exercised in this frozen UI run; the emulator and offline client/backend suites supply those checks. Teammates should reproduce the table with their own synthetic identity and configured backend, and keep live-model checks separate from offline fixture evidence.

## Reproduction

See [S3 setup](../S3_CONFIRMATION_CASES.md). Run the offline suite, lint and build before the emulator suite. Run the emulator command with the local-only `demo-opscrew-s3` project; it does not deploy rules, create cloud resources, activate billing or call a real model.

For every negative execution check, compare business case counts before and after. Runs, drafts, denied-operation audits or idempotency bookkeeping are not business cases. Denied requests disclose no other user's record. For commit/recovery checks, verify the persisted case, original confirmation, one success audit and stable deterministic case ID; never infer persistence from a client flag.

Formal reports record each assertion and all failures. An emulator result verifies local contracts, not production IAM, cloud availability, model quality, unlimited scale or a final competition submission.

## Remaining gate and handoff

Do not mark G3 complete before the real-resource evidence is present. Confirm the target Firebase project, Standard Firestore database region, Authentication provider, service identity and existing free-tier/resource configuration. Keep credentials outside Git. Use a small synthetic case and perform readback through the authenticated server. Preserve any failed attempts, unknown usage and latency evidence. Public Cloud Run deployment and S4/S5 timeout hardening remain later-stage work.

One known S4 availability risk remains: a `createRun` Firestore transaction may finish after the HTTP deadline and move the current head after a newer retry. The case gates fail closed, but a current plan may become superseded and require rerunning. S4 should bind creation to a durable operation ID and cover late transaction ordering/recovery. This is distinct from case-commit idempotency and cancellation/completion, which have passing regressions.

Native Computer Use detected the Comet AI Studio window, but three captures failed, including one after foreground activation. No Google account, project configuration or editor mutation was verified. The owner has been asked for an existing Firebase project ID or to defer the real-resource gate. Login state is session-specific. No new account, billing setup or deployment occurred.

Formatting, link validation, source/credential scanning and workspace cleanup are mandatory before declaring the full stage complete. Formal test sources, immutable evidence and the ignored dependencies/build needed for reproduction are retained. The parent-workspace Glob scan identified three new node-gyp `__pycache__` directories (21 `.pyc` files) and the two new Firebase/Firestore debug logs. Automatic approval review rejected the contained-path PowerShell deletion with `blocked by policy`; those ignored files remain and are excluded from publication. Cleanup is **incomplete** and requires owner/tool resolution before the full-stage done label. Neither this rejection nor the historical dist/Vite-cache deletion rejection is retried or bypassed. Local functional acceptance and the draft review handoff do not claim that cleanup or G3 passed.

Delivery validation: 22 UTF-8 Markdown files and 19 JSON files passed; local links were rechecked after adding the delivery binding. All twelve release fingerprints matched before the one-space runner correction; current files match the delivery source binding. The credential-pattern scan found no literal keys, JWTs or private keys in publishable files. The parent Glob scan examined 46,496 entries; 83 formal project/dependency `test_*` names were preserved. No `tmp_*` or `nul` was found. The three generated cache directories, 21 `.pyc` files and two debug logs remain ignored after the deletion rejection described above. The owned preview/emulator ports have no listeners, the browser viewport was reset and the agent-created local QA tab was closed.
