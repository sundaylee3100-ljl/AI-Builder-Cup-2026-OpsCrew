# OpsCrew: Expense Exception Plan & Review

OpsCrew is a fresh application created from zero in Google AI Studio Build for AI Builder Cup 2026. Gemini extracts synthetic USD expense facts, proposes a handling plan and performs a separate review. Fixed policy checks validate facts, citations and permitted actions. A person explicitly confirms an eligible current plan before one exception case is committed and independently read back. The application grants no reimbursement or payment approval.

The team reports Antigravity assistance with Google Cloud deployment. Runtime AI is Gemini; the prototype uses Cloud Run, Firebase visitor identity and Firestore. Creation records and later local contributions are documented in [provenance](PROVENANCE.md). The [official requirements](https://aibuildercup.com/themes.html) permit this Google AI/cloud route; ADK is not an additional mandatory tool.

## Current delivery status

- [Live product](https://opscrew-883881551915.us-central1.run.app): October 13 real API checks covered three workflows, one synthetic case, independent readback, idempotency and user isolation. October 14 public root/health/config/readiness and served entry returned HTTP 200 without new models/accounts/writes. Current cloud source/image/revision identity remains unverified.
- [PR #6 review](docs/acceptance/PR06-delivery-review-2026-10-14.md): reviewed UI removes a metadata-only receipt picker that bypassed input invalidation, replaces unsupported metric claims and restricts the communication draft to current eligible passing results. Copying is local text copying, not employee dispatch.
- Reviewed local checks: **236/236 offline tests**, strict TypeScript, production build and **12/12 native artifact groups** passed. These groups include nine HTTP checks and all five JavaScript chunks. A Linux container build and full current cloud/browser acceptance were not executed by this reviewer.
- The official-template English proposal includes recorded cloud evidence. Captain **Sunday Lee** and the [YouTube link](https://youtu.be/h53-tucE7ig) come directly from the owner. Public page metadata returns playability OK and length 168 seconds; actual signed-out playback and correspondence to local footage remain unverified.
- The supplied 168.181-second video package passes duration/decoding checks but fails content review. It uses historical local screenshots and unsupported feature/impact claims. Unaccepted candidate media are excluded from the current submission tree; the original candidate commit and owner's archive remain available. See [video review](docs/acceptance/PR06-video-review-2026-10-14.md).
- **Final submission is not yet ready.** Complete truthful cloud demonstration footage, playback/content checks and the release identity record. Actual portal submission and receipt remain future steps.

Use [the submission checklist](SUBMISSION_CHECKLIST.md), [recording plan](submission/RECORDING_PLAN.md) and [release manifest](RELEASE_MANIFEST.json). Historical evidence retains its original date, source and method.

## Repository layout

- aistudio-export-2026-10-07/: application, dependencies lock, formal tests, deployment tools and public synthetic fixtures.
- docs/: contracts, reviews, cloud handoff and immutable redacted evidence.
- submission/: official-template proposal, PDF, recording plan and maintained material builder.
- RELEASE_MANIFEST.json: reviewed source/material hashes and explicitly pending release/video/portal fields.

The [AI Studio editor](https://aistudio.google.com/apps/e8a0fb37-f747-45d2-b376-b832ac7fe09f) records creation; use Cloud Run to try the deployed prototype. Credentials, dependencies, build output and private authoring previews are excluded from Git.

## Reproduce local checks

Use Node 24 and npm 11. Pull reviewed main after PR #6 is merged, then run:

```powershell
git clone https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew.git
cd AI-Builder-Cup-2026-OpsCrew/aistudio-export-2026-10-07
npm ci
npm test
npm run lint
npm run build
npm run smoke:artifact
```

The native artifact check uses a fresh production-only lockfile install and verifies the runtime layout used by Docker; it does not run a Linux container. Offline tests use injected providers and local stores. Real Google resources are tested separately with explicit identity/model/write authorization.

For local development, copy .env.example to .env and run npm run dev. Keep GEMINI_API_KEY only on the server. The reviewed default is gemini-3.1-flash-lite. Public model routes require Firebase visitor identity and persistent admission. Static Vite preview is not the full API application.

Quotas reserve up to six attempts per workflow: global concurrency 2, visitor concurrency 1, global 6 runs/minute and 60/day, visitor 2/minute and 12/day. Unknown/failed usage is not refunded. Request quotas and alerts-only budgets do not prove an all-resource currency spending cap. Readiness uses a bounded Firestore read with zero model calls; a green probe alone does not establish the business flow.

## Competition handoff

The theme is **Future of Work & Enterprise Productivity**. Judging weights are technical/GenAI 40%, problem/impact 25%, innovation 25% and experience/design 10%. Materials explain the fixed policy, separate review, human authorization and independent readback. Performance and impact claims must retain measurement or assumption boundaries.

Published formation closes October 14 and prototype submission October 18, 2026. Verify the actual portal clock/timezone, roster and declarations. October 16 freeze and October 17 submission are internal buffers. [Official timeline](https://aibuildercup.com/index.html)

Follow [the cloud handoff](docs/CLOUD_TEAMMATE_HANDOFF.md) for release identity and resource checks. Preserve model/prompt/policy versions and failed attempts during new deployments. Keep identity and financial documents private. Record the Submitted receipt after actual portal submission.
