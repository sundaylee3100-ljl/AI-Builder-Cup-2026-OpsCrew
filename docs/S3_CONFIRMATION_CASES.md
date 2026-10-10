# S3: human confirmation and durable synthetic cases

S3 extends the Google AI Studio Build prototype with Firebase Authentication, server-owned runs, human confirmation and transactional Cloud Firestore records. A created case requests evidence or manual review. It does not approve reimbursement, transfer funds, or connect to a financial system. All development inputs remain synthetic. See [policy contracts](POLICY_AND_CONTRACTS.md) and [the evaluation protocol](EVALUATION_PROTOCOL.md).

## Authorization and storage boundaries

The server derives the owner UID from a verified Firebase ID token. A UID, role, workflow status or `approved` flag in a request body cannot establish permission. Every run, plan, confirmation and case operation checks the resource's owner independently of token validity. The browser uses the server API and never reads or writes Firestore directly.

The checked-in Firestore rules deny every client read and write. Firebase Admin SDK operations bypass Security Rules, so these rules do not replace the server's UID checks. Production uses Application Default Credentials and IAM; no service-account JSON or model credential belongs in this repository. [Firebase token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [server library security](https://firebase.google.com/docs/firestore/security/insecure-rules)

Only a current, policy-supported plan with a passing Reviewer can offer human confirmation. The confirmation binds the owner, run, input/facts/plan versions, policy version, allowed action, SHA-256 input and plan digests, confirmation time and expiry. Rejecting a plan or invalidating edited input prevents a new case from that authorization. A submitted case remains an audit record; changed input starts a new run.

Preparing confirmation creates a bounded review intent, not approval or a business case. The explicit user action submits `confirmed: true` with that intent and its current version binding. The server creates the actual confirmation snapshot together with the case in the transaction.

The approval-and-create transaction writes the confirmation snapshot, deterministic case, success audit and idempotency result atomically. Business uniqueness is `(UID, plan ID, plan version, action)`, including when concurrent callers use different client keys. An owner-scoped idempotency key cannot be reused with a different command. The transaction callback makes no Gemini calls or other external side effects. [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)

The create response establishes a committed case ID, not a verified success receipt. The client requests an independent owned readback and displays success only after that record is validated. A lost response or temporarily unavailable readback leaves the result pending until recovery finds the existing case. A confirmation valid at commit may be read back after expiry without another write or new human confirmation.

## API and review flow

Authenticated requests use `Authorization: Bearer <Firebase ID token>` over the local loopback connection during emulator testing, and HTTPS for a future public deployment. Tokens remain in the Firebase session and request headers; they are never included in acceptance evidence.

| Route | Purpose |
| --- | --- |
| `POST /api/workflow` | Analyze synthetic intake with FACTS, Planner and Reviewer; persist the server-owned run and binding when Firebase is enabled. |
| `GET /api/runs` / `GET /api/runs/:runId` | Restore only the current UID's durable history and an owned run. |
| `POST /api/runs/:runId/confirmation` | Prepare a current review intent from `{ binding }`. |
| `POST /api/runs/:runId/reject` / `invalidate` | Reject the owned plan or invalidate edited input, using `{ binding }`. |
| `POST /api/cases` | Submit `{ approval_id, binding, idempotency_key, confirmed: true }`; return the deterministic committed case ID and actual committed approval ID. |
| `POST /api/cases/recover` | Read-only lookup using the original strict command, with independent persisted proof. Return an existing committed case or `CASE_NOT_COMMITTED`; never create or modify a record. |
| `GET /api/cases/:caseId` | Independently verify the persisted owned case, approval, run and success audit before a verified receipt. |
| `GET /api/cases` | Restore owned case history; a separate case GET establishes a verified receipt. |

Use a stable idempotency key for retries of the same current command. Keep a pending command until recovery completes, and obtain a new intent and key when input or the plan changes. An edit clears the displayed plan/confirmation locally and requests invalidation of the server's derived result. If invalidation could not reach the server, an edited pending command uses the read-only recovery route; it cannot retry creating the old case. Local anonymous identity separation and durable records do not establish a permanent user account: losing that session's identity means its records are not exposed to a different UID.

## Local emulator setup

Use Node 24 and the locked dependencies. Use Java 21 or newer: the official Firestore emulator documentation announces the upcoming Java 21 requirement. [Emulator installation](https://firebase.google.com/docs/emulator-suite/install_and_configure), [Firestore emulator connection](https://firebase.google.com/docs/emulator-suite/connect_firestore)

From `aistudio-export-2026-10-07`:

```text
npm ci
npm run test
npm run lint
npm run build
npx firebase emulators:exec --only auth,firestore --project demo-opscrew-s3 "node scripts/check-s3-emulator.mjs"
```

This default prints results without replacing any historical evidence. To save a new checkpoint, choose an unused filename:

```text
npx firebase emulators:exec --only auth,firestore --project demo-opscrew-s3 "node scripts/check-s3-emulator.mjs --output ../docs/acceptance/S03-emulator-validation-teammate-01.json"
```

The runner rejects overwriting a report, a path outside the immediate acceptance directory or a nonconforming filename. Do not reuse the frozen release filename.

The committed `firebase.json` binds Authentication to `127.0.0.1:9099` and Firestore to `127.0.0.1:8080`. `.firebaserc` names the local-only `demo-opscrew-s3` project. The test script requires both emulator hosts and a `demo-` project, and refuses a non-loopback host or a real project. It creates two local synthetic identities, keeps tokens in process memory, and uses injected public development-fixture model outputs. It makes zero real Gemini calls and zero production Firebase writes. [Demo project isolation](https://firebase.google.com/docs/emulator-suite/connect_firestore)

The checked-in indexes support the server's owner-filtered, newest-first run and case histories in the `opscrew_s3` namespace. A real-resource configuration must apply both the deny-all rules and these indexes to the target Standard Firestore database; emulator success does not prove that the production indexes or IAM were configured.

Admin SDK emulator host variables have no `http://` prefix. Firebase Authentication emulator tokens are unsigned and valid only in explicitly configured emulator mode. Production must not set `FIREBASE_AUTH_EMULATOR_HOST` or `FIRESTORE_EMULATOR_HOST`, and must reject emulator tokens. [Authentication emulator behavior](https://firebase.google.com/docs/emulator-suite/connect_auth)

`FIREBASE_WEB_API_KEY` comes from the Firebase web app's public configuration and must differ from the server's `GEMINI_API_KEY`. Startup rejects a Gemini key prefix or an exact reuse of the configured model secret in the browser-visible Firebase configuration. The separate offline security suite also checks invalid/missing configuration, mixed emulator routing and production rejection of unsigned emulator-shaped tokens.

The emulator runner owns its temporary HTTP server and closes it on completion. `emulators:exec` stops its emulators. Formal test sources and acceptance evidence remain; disposable logs, export directories, caches and debug artifacts are excluded from public Git and cleaned before delivery.

## Teammate browser check

The automated emulator runner injects offline providers internally; the ordinary application has no offline model fallback. To exercise the UI with your own live Gemini access and local Firebase storage, first start the emulators in one terminal:

```text
npx firebase emulators:start --only auth,firestore --project demo-opscrew-s3
```

In another terminal at the application directory, set these local process variables (PowerShell example). The placeholder Firebase values below are emulator-only; keep your real Gemini key in the ignored server `.env` as described in the repository README.

```powershell
$env:NODE_ENV = 'development'
$env:OPSCREW_FIREBASE_MODE = 'emulator'
$env:FIREBASE_PROJECT_ID = 'demo-opscrew-s3'
$env:FIREBASE_WEB_API_KEY = 'emulator-only-placeholder'
$env:FIREBASE_AUTH_DOMAIN = 'demo-opscrew-s3.firebaseapp.com'
$env:FIREBASE_WEB_APP_ID = 'emulator-only-app'
$env:FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
npm run dev
```

Open `http://127.0.0.1:3000`, start the visitor session, run a synthetic missing-receipt preset, inspect its plan and passing review, then confirm explicitly. Verify the separate readback receipt, reload and verify the same case from history. Use a separate browser session to check owner isolation. End both owned processes with Ctrl+C and close the task-specific terminal to discard its environment; do not route production credentials to emulators. This UI check can consume Gemini quota, and a model/provider failure must remain visible. The frozen UI screenshots instead used an explicitly injected fixture in a test harness; they do not certify this new live run.

## Verification and the real-resource gate

The offline suite verifies deterministic contracts and injected errors. The separate emulator run verifies local Firebase identity, owner isolation, transaction persistence, direct-client rule denial, concurrency, rejection, stale/tampered commands, idempotency and recovery. Its report explicitly identifies synthetic injected model outputs, local emulator storage and all failed assertions.

S3's G3 gate also requires at least one authorized real Firestore write and independent readback using the accepted release, Firebase identity and real Gemini workflow. Local or emulator success cannot satisfy that real-resource gate. Cloud deployment is currently deferred. An existing authorized Firebase project may support a small local-server/real-resource check; any new project/account/provider activation or paid-resource setup requires the owner's concrete project, region and permission before execution. The current executed outcomes and remaining prerequisites are recorded in [S03 acceptance](acceptance/S03-confirmation-and-cases.md).
