# OpsCrew: Expense Exception Plan & Review

OpsCrew is a fresh application created from zero in Google AI Studio Build for AI Builder Cup 2026. Gemini extracts synthetic expense facts, proposes a policy-grounded plan and reviews it through separate prompted stages. Fixed validators constrain citations, facts, versions and permitted actions. A person explicitly confirms an eligible plan before a case is saved and independently retrieved. The application does not execute reimbursement or payments.

## Competition materials

- [Live prototype](https://opscrew-883881551915.us-central1.run.app)
- [Accepted demonstration video](https://youtu.be/j94ffx_yrng): owner-approved natural narration, local encoded duration103.941333 seconds, strictly below 180 seconds. Signed-in hosted playback is owner-confirmed; complete anonymous playback has not been verified by the reviewer.
- [Official-template proposal PDF](submission/OpsCrew_Proposal_Cloud_submission-final-2026-10-16.pdf) and [editable PPTX](submission/OpsCrew_Proposal_Cloud_submission-final-2026-10-16.pptx)
- [Five submission fields and brief description](submission/SUBMISSION_FORM.md)
- [Submission checklist](SUBMISSION_CHECKLIST.md), [source and tool provenance](PROVENANCE.md), [release manifest](RELEASE_MANIFEST.json)

Captain display name: **Sunday Lee**. Theme: **Future of Work & Enterprise Productivity**. The team reports Antigravity assistance with Google Cloud deployment. Google AI Studio/Gemini with Cloud Run/Firebase follows the published Google route; ADK is not mandatory. [Official requirements](https://aibuildercup.com/themes.html)

The materials are prepared for captain review. Verify public-video access, actual portal limits/roster/declarations/cutoff and submit through the registered account. No Submitted receipt is claimed. The published deadline is October 18, 2026, without an exact public cutoff/timezone. Keep the prototype available through October 19-November 6 evaluation. [Timeline](https://aibuildercup.com/index.html)

## Try the prototype

Open the live URL, start a visitor session and use synthetic expense text/form values. Run the facts, plan and review workflow. For an eligible current plan, prepare confirmation, review the proposed case, check consent and explicitly confirm. The application independently reads the saved record; the same visitor can reopen history. Copying an operator draft does not send a message. Demonstrations use synthetic data only.

Visitors do not need a Gemini API key. The server supports Vertex AI with application-default service credentials and an optional Developer API mode with a server-only key. The public configuration reports Vertex AI and Gemini 2.5 Flash. Never put provider keys in the PDF, browser, public repository or video. See the application's blank `.env.example` for local setup.

## Reviewed implementation and evidence

The review integrates public cloud source `87767c9` and explicitly pins Developer API selection to prevent SDK environment flags from silently changing providers. Facts, Planner and Reviewer share the SDK factory; production identity, persistent admission, deterministic gates, bounded retries/timeouts and attempt records remain. This SDK route does not establish an ADK or hosted Agent Engine application.

October 16 checks passed **246/246 offline tests**, strict TypeScript, a 1677-module build and **12/12 native production-artifact groups** including9 HTTP checks and all 5 JavaScript chunks. All five built chunks match the dated public observations. One earlier parallel-suite timing assertion failed; the unchanged target 11/11 and complete serial suite then passed. Failures, exact source hashes and limits are retained in [integrated validation](docs/acceptance/FINAL-integrated-validation-2026-10-16.json). No Linux container build is claimed.

October 13's three real Gemini 3.1 workflows and October 14's236-test results remain historical evidence. This review performs no new cloud signup, model workflow, case write, deployment, billing or IAM change. Public root/health/config/readiness HTTP200 and matching frontend bytes do not independently authenticate backend/image identity or a new Vertex response. The [team deployment record](docs/acceptance/PR06-cloud-deployment-binding-2026-10-16.json) provides resource identifiers; independent control-plane/source-archive comparison is not available and its verification timezone needs clarification.

The reviewed source reserves up to six provider attempts per workflow. Limits include global concurrency 2/visitor 1, global 6 runs/minute and 60/day, visitor 2/minute and 12/day. Unknown usage is not refunded. Request limits and billing alerts do not guarantee a monetary cap. Public fixtures/injected tests are not independent hidden or real-model accuracy evaluation.

## Reproduce local checks

Use Node 24/npm 11. These checks verify local implementation, not live model access:

```powershell
git clone https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew.git
cd AI-Builder-Cup-2026-OpsCrew/aistudio-export-2026-10-07
npm ci
node --import tsx --test --test-concurrency=1 tests/*.test.ts
npm run lint
npm run build
npm run smoke:artifact
```

For local development, copy `.env.example` to `.env`, configure the intended server provider and run `npm run dev`. Static Vite preview is not the full API. The native artifact check uses fresh production-only dependencies and runtime layout; it does not run a Linux container. [Cloud handoff](docs/CLOUD_TEAMMATE_HANDOFF.md) separates new resource/model actions from offline checks.

The application and formal tests are in `aistudio-export-2026-10-07/`; dated contracts/evidence are in `docs/`; current materials and maintained local builders are in `submission/`. Credentials, dependencies, build output and private authoring previews are excluded from Git. The raw recorded input is retained separately for reproducibility, not as a submission video. Earlier rejected video URLs are documented in the dated QA and must not replace the accepted link above.
