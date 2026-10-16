# Prepared submission fields

Prepared October 16, 2026 (Asia/Shanghai). This is a preparation record, not a Submitted receipt. Use the final files below; neither superseded video link is accepted. Captain checks and actual submission remain pending.

## Project identity

- Team: OpsCrew
- Project: OpsCrew: Expense Exception Plan & Review
- Captain display name: Sunday Lee (owner supplied)
- Theme: Future of Work & Enterprise Productivity

## Five required items

| Portal item | Prepared value | Acceptance status |
| --- | --- | --- |
| Official-template presentation | `OpsCrew_Proposal_Cloud_submission-final-2026-10-16.pdf`; editable PPTX retained | Final English official-template revision includes the new video link and integrated provider architecture. Visual/page/link QA is recorded in its acceptance JSON. |
| Demonstration video | `OpsCrew_Submission_Demo_2026-10-16.mp4`; 103.941333 seconds; SHA-256 `f7926c166ec12be50a83557209c4cb982142bdbe5512ebfaed9012c72020ee0a`; https://youtu.be/j94ffx_yrng | Owner watched and accepted the slower narration and supplied the corresponding new URL. Technical/frame QA passes. Full anonymous hosted playback remains unverified; owner checked while signed in. |
| Deployed prototype | https://opscrew-883881551915.us-central1.run.app | Root, health, config and readiness returned HTTP 200 on October 16. Public Vertex AI / Gemini 2.5 Flash source is integrated and reviewed. Deployment identifiers are team-reported; no independent control-plane or current real Vertex workflow test by reviewer. |
| Public repository | https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew | Public. Reviewed Vertex source and provider-selection fix passed 246 offline tests, types, build and twelve native-artifact groups; final merge identity is recorded on GitHub. |
| Brief description | Copy the text below | Prepared in English; verify the portal character limit. |

The new owner-supplied `https://youtu.be/8MACVIPWCt8` represents the uncorrected recording. The earlier `https://youtu.be/h53-tucE7ig` was also content-rejected. Neither is an accepted replacement URL. The raw `Original_Recorded_Demo_2026-10-16.mp4` is retained for reproducibility and is not the submission video.

## Brief description

OpsCrew is a guarded expense-operations copilot created from scratch in Google AI Studio Build for AI Builder Cup 2026. Gemini extracts facts, proposes a policy-grounded next action, and reviews the proposal through separately prompted stages. Structured validation, cited synthetic policy clauses, and version checks constrain the workflow. A user must explicitly confirm an eligible action before a case is persisted; the application then retrieves it independently to verify the result. The prototype runs on Google Cloud Run with Firebase Authentication and Cloud Firestore. Demonstrations use synthetic data. OpsCrew does not execute reimbursement payments.

Short version, if the portal imposes a smaller limit:

OpsCrew uses Gemini to extract expense facts, propose a cited handling plan and review it. A person explicitly confirms eligible actions before a case is saved and independently retrieved. Built from scratch in Google AI Studio Build and deployed on Google Cloud Run with Firebase and Firestore, the prototype uses synthetic data and does not execute payments.

## Captain's final sequence

1. Confirm registered roster, eligibility, asset rights, theme, declarations, template version, upload limits and the actual portal deadline/timezone.
2. The owner accepted the revised narration and its new YouTube upload. Verify complete playback without a team login; ordinary public/unlisted YouTube videos do not generally require a Google account. If this link is restricted, adjust visibility or provide an anonymously playable public Drive/Vimeo alternative.
3. Review the actual deployed backend source and its build/image/revision evidence. Earlier October 13 model tests do not certify the changed backend now reported by the service. These identity fields are the team's verification method, not an official contest form specification.
4. Use the new official-template proposal with accepted video URL and integrated architecture; retain its verified page/link record and the reviewed merge/material identities.
5. Check the five items together, upload the final PDF and fill the portal fields. The captain completes personal declarations and the authorized final submission.
6. After actual submission, retain its Submitted status, receipt/ID/time and final material hashes. Keep the prototype and public links available during October 19-November 6 evaluation.

## Supporting checks

- [Submission checklist](../SUBMISSION_CHECKLIST.md)
- [Corrected-video QA](../docs/acceptance/FINAL-video-corrected-QA-2026-10-16.md)
- [Current public read-only observations](../docs/acceptance/FINAL-cloud-readonly-2026-10-16.json)
- [Official requirements and judging](https://aibuildercup.com/themes.html), [FAQ](https://aibuildercup.com/Faqs.html), [timeline](https://aibuildercup.com/index.html)

## Model access and credentials

Do not provide a Gemini API key to the organizer or include it in the PDF, public repository, browser bundle or video. Judges use the deployed application's interface. The server authenticates its own Gemini calls through Vertex AI application-default service credentials; optional Developer API mode uses a server-only key. Keep the service and its approved model quota available during evaluation. The public source documents configuration through blank environment examples. The official required submission list does not request distributing credentials.
