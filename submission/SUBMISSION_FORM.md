# Submitted project material index

Updated October 17, 2026 (Asia/Shanghai). **The owner reports that competition submission is complete.** The entries below identify the team's reviewed package. The portal receipt, exact submission time and uploaded bytes were not independently inspected. See [owner confirmation](../docs/acceptance/SUBMISSION-owner-confirmation-2026-10-17.json). The accepted 3:30.66 video is distributed through its YouTube link; its MP4 master stays local.

## Project identity

- Team: OpsCrew
- Project: OpsCrew: Expense Exception Plan & Review
- Captain display name: Sunday Lee (owner supplied)
- Theme: Future of Work & Enterprise Productivity

## Five required items

| Portal item | Prepared value | Acceptance status |
| --- | --- | --- |
| Official-template presentation | [October 17 PDF](OpsCrew_Proposal_Cloud_submission-final-2026-10-17.pdf); [editable PPTX](OpsCrew_Proposal_Cloud_submission-final-2026-10-17.pptx) | Matching new-video revision; see its page/link acceptance. The October 16 files contain the old short-video URL and remain historical. |
| Demonstration video | https://youtu.be/rdbS1XUNUjw | 210.661333 seconds (3:30.66), matching local MP4/SRT/VTT in [recording plan](RECORDING_PLAN.md). Owner confirmed the replacement is usable and supplied this upload link. Complete anonymous hosted playback is not independently verified. |
| Deployed prototype | https://opscrew-883881551915.us-central1.run.app | Root, health, config and readiness returned HTTP 200 on October 16. Public Vertex AI / Gemini 2.5 Flash source is integrated and reviewed. Deployment identifiers are team-reported; no independent control-plane or current real Vertex workflow test by reviewer. |
| Public repository | https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew | Public. Reviewed Vertex source and provider-selection fix passed 246 offline tests, types, build and twelve native-artifact groups; final merge identity is recorded on GitHub. |
| Brief description | Copy the text below | Prepared in English; verify the portal character limit. |

The earlier `https://youtu.be/j94ffx_yrng` represents the owner-approved 103.941333-second edit, which is too short for the current field. `8MACVIPWCt8` and `h53-tucE7ig` were content-rejected. None represents the new 3–4 minute file. The raw `Original_Recorded_Demo_2026-10-16.mp4` is a reproducible input. See the [duration decision](../docs/acceptance/VIDEO-3to4-duration-rule-2026-10-16.md).

## Brief description

OpsCrew is a guarded expense-operations copilot created from scratch in Google AI Studio Build for AI Builder Cup 2026. Gemini extracts facts, proposes a policy-grounded next action, and reviews the proposal through separately prompted stages. Structured validation, cited synthetic policy clauses, and version checks constrain the workflow. A user must explicitly confirm an eligible action before a case is persisted; the application then retrieves it independently to verify the result. The prototype runs on Google Cloud Run with Firebase Authentication and Cloud Firestore. Demonstrations use synthetic data. OpsCrew does not execute reimbursement payments.

Short version, if the portal imposes a smaller limit:

OpsCrew uses Gemini to extract expense facts, propose a cited handling plan and review it. A person explicitly confirms eligible actions before a case is saved and independently retrieved. Built from scratch in Google AI Studio Build and deployed on Google Cloud Run with Firebase and Firestore, the prototype uses synthetic data and does not execute payments.

## Submission record and evaluation handoff

1. Submission completion is recorded from the owner's explicit confirmation. Retain any portal receipt, submission ID and exact time privately; none is invented in the public repository.
2. Keep the accepted hosted video `https://youtu.be/rdbS1XUNUjw` and prototype available during October 19-November 6 evaluation. Complete anonymous video playback has not been independently verified by the reviewer.
3. Retain the October 17 PDF/PPTX, its page/link acceptance and final file identities. Earlier proposals and media remain dated history. This index does not assert an independently inspected portal upload.
4. The cloud owner maintains service availability and approved model access. October 13 model tests do not certify the changed backend. Team deployment identifiers remain team-reported evidence rather than an additional official submission format.
5. This GitHub update publishes current documentation and the paired proposal. It does not resubmit the portal form or change the deployed application.

## Supporting checks

- [Submission checklist](../SUBMISSION_CHECKLIST.md)
- [Current duration decision](../docs/acceptance/VIDEO-3to4-duration-rule-2026-10-16.md)
- [Historical short-video QA](../docs/acceptance/FINAL-video-corrected-QA-2026-10-16.md)
- [Current public read-only observations](../docs/acceptance/FINAL-cloud-readonly-2026-10-16.json)
- [Official requirements and judging](https://aibuildercup.com/themes.html), [FAQ](https://aibuildercup.com/Faqs.html), [timeline](https://aibuildercup.com/index.html)

## Model access and credentials

Do not provide a Gemini API key to the organizer or include it in the PDF, public repository, browser bundle or video. Judges use the deployed application's interface. The server authenticates its own Gemini calls through Vertex AI application-default service credentials; optional Developer API mode uses a server-only key. Keep the service and its approved model quota available during evaluation. The public source documents configuration through blank environment examples. The official required submission list does not request distributing credentials.
