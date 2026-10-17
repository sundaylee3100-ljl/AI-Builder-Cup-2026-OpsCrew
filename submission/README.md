# Competition submission package

**Submitted — confirmed by the team on October 17, 2026.** Captain: **Sunday Lee**. This status comes from the owner; no independently verified portal receipt is claimed. The application was created from zero in Google AI Studio Build, with Gemini and Cloud Run/Firebase. The team reports Antigravity assistance with deployment.

## Submitted selection

| Deliverable | Current file or link |
| --- | --- |
| Official-template proposal | [13-page October 17 PDF](OpsCrew_Proposal_Cloud_submission-final-2026-10-17.pdf) |
| Editable proposal | [October 17 PPTX](OpsCrew_Proposal_Cloud_submission-final-2026-10-17.pptx) |
| Proposal verification | [Page and link acceptance](OpsCrew_Proposal_Cloud_submission-final-2026-10-17.acceptance.json) |
| Demonstration video | [YouTube: current final video](https://youtu.be/rdbS1XUNUjw) — **3:30.66** |
| English captions | [SRT](OpsCrew_Submission_Demo_3to4min_2026-10-16.srt), [VTT](OpsCrew_Submission_Demo_3to4min_2026-10-16.vtt) |
| Live prototype | [Open OpsCrew](https://opscrew-883881551915.us-central1.run.app) |
| Public source | [GitHub repository](https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew) |
| Form text and checklist | [Five fields and brief description](SUBMISSION_FORM.md), [submission checklist](../SUBMISSION_CHECKLIST.md) |

The final MP4 is retained locally and shared through YouTube; it is not uploaded to this repository. The owner accepted the final content and supplied this hosted link. Complete anonymous hosted playback has not been independently verified by the reviewer. Judges use the application; server-side model credentials are never distributed.

## Video and material verification

The encoded video is **210.661333 seconds**, within the actual submission form's **3–4 minute** field. It uses natural default-rate English narration with short semantic pauses and synchronized captions. Five recorded UI sections retain their original order, values, results and speed; additional explanatory cards provide context. There is no audio time stretching, UI slow motion or added UI hold.

The [recording plan](RECORDING_PLAN.md), [technical QA](../docs/acceptance/VIDEO-3to4-QA-2026-10-16.json) and [owner acceptance/publication record](../docs/acceptance/VIDEO-3to4-owner-publication-2026-10-17.json) retain the local master identity and verification boundaries. The [duration decision](../docs/acceptance/VIDEO-3to4-duration-rule-2026-10-16.md) records the conflict between public website wording and the supplied submission field. Earlier video and proposal revisions are historical; the October 17 proposal above links the current final video.

The proposal cites the unchanged dated October 16 engineering evidence: **246/246 offline tests**, TypeScript/build checks and **12/12 native production-artifact groups**. These do not claim a new live model test, Linux container build or independent backend image attestation. See [integrated validation](../docs/acceptance/FINAL-integrated-validation-2026-10-16.json), [provenance](../PROVENANCE.md) and [release manifest](../RELEASE_MANIFEST.json).

## Maintained authoring sources

The [current video builder](build-submission-demo-3to4.mjs) uses local Windows System.Speech/Zira rate 0 and FFmpeg/FFprobe. It validates the recorded input against approved source hashes and makes no cloud, account, model or paid-TTS call. To reproduce it from the repository root, provide the retained original recording:

```powershell
node submission/build-submission-demo-3to4.mjs --input=PATH_TO_APPROVED_ORIGINAL_RECORDING.mp4
```

The input is not downloaded from YouTube. Refer to the recording plan for the approved input hashes and the local production details. The older `build-reviewed-demo.mjs` reproduces a historical short edit and is not the current submission builder.

The [proposal builder](build-proposal.mjs) uses the local Artifact Tool and the official template. Later material changes require a distinct dated revision, matching links and fresh page verification; dated execution evidence should stay unchanged. See the [cloud handoff](../docs/CLOUD_TEAMMATE_HANDOFF.md) for deployment and model-access configuration.
