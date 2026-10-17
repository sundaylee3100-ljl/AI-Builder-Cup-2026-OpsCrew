# OpsCrew team delivery status

Updated October 17, 2026 (Asia/Shanghai). **The owner confirms competition submission is complete.** The reviewed 210.661333-second video is distributed through https://youtu.be/rdbS1XUNUjw; the local MP4 is excluded from GitHub per the owner's request. Current fields select the October 17 proposal. [Owner confirmation](acceptance/SUBMISSION-owner-confirmation-2026-10-17.json) distinguishes that report from independent portal/receipt verification. The earlier short video and proposal remain historical. Complete anonymous hosted playback remains unverified. See [current material index](../submission/SUBMISSION_FORM.md).

## Submission identity

- Project: OpsCrew: Expense Exception Plan & Review
- Captain display name: Sunday Lee (owner supplied)
- Theme: Future of Work & Enterprise Productivity
- [Public repository](https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew)
- [Live prototype](https://opscrew-883881551915.us-central1.run.app)
- [Five prepared portal items and English description](../submission/SUBMISSION_FORM.md)

OpsCrew was created from scratch in Google AI Studio Build during the competition. The teammate's Antigravity deployment assistance is owner-reported. Gemini, Cloud Run, Firebase Authentication and Firestore form the declared Google route. The shared SDK's Vertex AI provider mode is not proof of an ADK or hosted Agent Engine application.

## Source and deployment observations

Public source commit `87767c905a0468120bb7858e9df1cf158291d10c` implements Developer API and Vertex AI SDK/ADC modes. The review branch integrates this source and explicitly pins the Developer API client to `vertexai:false` to prevent environment flags from silently switching its provider. The added regression intercepts actual SDK requests offline; it makes no real model or credential request.

The teammate's [deployment record](acceptance/PR06-cloud-deployment-binding-2026-10-16.json) reports:

| Field | Team-reported value |
| --- | --- |
| Deployed source | `87767c905a0468120bb7858e9df1cf158291d10c` |
| Cloud Build | `66f32f78-b90c-4cfa-bece-43baa15c6719` |
| Image digest | `sha256:5f5e72ebce9d24001eec458227163d1b9d8d872c69f6f28030367230b6350236` |
| Active revision | `opscrew-00005-g99`, reported 100% traffic |

The reviewer independently retrieved the public source and observed root, health, config and readiness HTTP 200. The config reports Vertex AI mode and `gemini-2.5-flash`, consistent with that source. A fresh integrated frontend build matches the observed public entry bytes; see the current acceptance records. These checks do not independently authenticate Cloud Run traffic allocation, build provenance, IAM, ADC permissions or an actual Vertex response.

The submitted record does not contain raw Cloud Run/Build query excerpts or the source archive comparison hashes. Its `verified_at` is marked `2026-10-16T09:03:55Z`, although its containing commit was created at `2026-10-16T01:10:03Z`. This apparent timezone inconsistency needs owner clarification; the original record is preserved as received. Do not silently convert or endorse that timestamp. The four release identifiers are a team verification method, not a contest-prescribed JSON format.

## Engineering evidence

The original integrated provider source passed 245 tests and strict type checking on October 16. The subsequent provider-selection fix has an independently passing ten-test targeted suite and type check. Final integrated full-suite and production-artifact results are recorded separately; intermediate failures remain in the review record rather than being omitted.

October 14's 236 tests and twelve native-artifact groups and October 13's three real Gemini workflows remain dated historical evidence. The latter used the previously observed provider/model and do not certify a fresh Vertex workflow. No additional signup, paid model call, case write, deployment or IAM change was performed in this review. Public development fixtures are not independent hidden evaluation cases.

## Video and proposal

The owner's original `8MACVIPWCt8` recording contains useful interface operation but also unsupported narration/cards. It is not accepted as the final video. The earlier `h53-tucE7ig` is also rejected.

The first offline correction passed technical and visual checks but was too fast according to the owner's actual playback. The owner accepted the slower rate 0 revision and corresponding YouTube upload (https://youtu.be/j94ffx_yrng). That historical short local file, captions, measured duration, editing disclosures and remaining human/public-playback checks are tracked in [historical video QA](acceptance/FINAL-video-corrected-QA-2026-10-16.md). The new 3–4 minute file has a [separate final local review](acceptance/VIDEO-3to4-final-review-2026-10-16.json). Source data, checkbox state, case identifiers and result states are not fabricated. The editorial service label is not native browser provenance.

The previous thirteen-page October 16 official-template PDF/PPTX include the integrated provider architecture and 246-test evidence, but reference the old short-video URL. They are historical. The separate October 17 revision uses the owner-accepted new video URL and has its own page/link acceptance record. Metadata/title access does not establish complete anonymous playback acceptance.

## Evaluation-period handoff

1. Use the owner-accepted new link `https://youtu.be/rdbS1XUNUjw`; verify complete anonymous hosted playback. Owner content acceptance and the link are recorded in [the October 17 follow-up](acceptance/VIDEO-3to4-owner-publication-2026-10-17.json).
2. Clarify the deployment timestamp and retain original control-plane/build/source comparison evidence if asserting an independently verified deployment chain. Maintain an owner for quota, billing and availability through evaluation.
3. Retain any portal receipt, submitted roster and declarations privately. The owner reports submission complete; the public repository does not invent a receipt ID, exact time or independent uploaded-file inspection.
4. Keep the reviewed proposal identities and public links available during October 19-November 6 evaluation. This GitHub publication does not resubmit the competition form or redeploy the service.

No claim is made of a sub-15-second SLA, guaranteed currency spending cap, immutable ledger, cryptographic signature, zero hallucinations, automatic employee dispatch, OCR, payment execution or universal security verification.
