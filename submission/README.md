# Submission package

Current selection:16 October 2026. Captain: Sunday Lee. OpsCrew was created from zero in Google AI Studio Build; Gemini and Cloud Run/Firebase form the Google route. See [prepared submission fields](SUBMISSION_FORM.md) and [checklist](../SUBMISSION_CHECKLIST.md).

## Use these files

| Deliverable | File / link |
| --- | --- |
| Official-template PDF | [Final proposal](OpsCrew_Proposal_Cloud_submission-final-2026-10-16.pdf) |
| Editable source | [Final presentation](OpsCrew_Proposal_Cloud_submission-final-2026-10-16.pptx) |
| Final local video | [Accepted video](OpsCrew_Submission_Demo_2026-10-16.mp4) |
| English caption files | [SRT](OpsCrew_Submission_Demo_2026-10-16.srt), [VTT](OpsCrew_Submission_Demo_2026-10-16.vtt) |
| Hosted video | https://youtu.be/j94ffx_yrng |
| Live prototype | https://opscrew-883881551915.us-central1.run.app |
| Public source | https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew |
| Prepared form / description | [SUBMISSION_FORM.md](SUBMISSION_FORM.md) |

The owner accepted the revised narration and confirmed matching signed-in hosted playback. The local file is103.941333 seconds,1920x1080/25fps; SHA-256 `f7926c166ec12be50a83557209c4cb982142bdbe5512ebfaed9012c72020ee0a`. Rate0 narration is about19.17 percent slower words/minute than the prior edit, with0.4 s scheduled semantic gaps and no detected silence over1.5 s. Fourteen caption cues share the measured narration timing. [Video QA](../docs/acceptance/FINAL-video-corrected-QA-2026-10-16.md)

Full anonymous hosted playback is not verified. Ordinary public/unlisted YouTube videos generally do not require a Google account; confirm public access before submission. The earlier `8MACVIPWCt8` and `h53-tucE7ig` candidates are rejected and must not be used. The raw `Original_Recorded_Demo_2026-10-16.mp4` is preserved only for reproducibility. Historical proposals are not current submission selections.

The final13-page PDF has real GitHub/product/video hyperlink annotations and image-based pages; the PPTX retains editable text, tables and diagrams. [Proposal acceptance](OpsCrew_Proposal_Cloud_submission-final-2026-10-16.acceptance.json) records final hashes, template/package checks and page inspection. No API key is included or required from a judge. The server uses Vertex AI ADC or optional server-only Developer API credentials.

## Maintained builders

`build-reviewed-demo.mjs` uses local Windows System.Speech/Zira and FFmpeg/FFprobe. It checks a whitelist input hash before writing and does not contact cloud/models/accounts or paid TTS. The five recorded UI sections remain in original order/speed; the0.8 s history hold and all editorial narration/caption/label changes are disclosed. Do not rebuild an accepted video without a new content review and matching publication. An input-only check creates no output:

```powershell
node submission/build-reviewed-demo.mjs --input=submission/Original_Recorded_Demo_2026-10-16.mp4 --check-input-only
```

`build-proposal.mjs` uses the bundled local Artifact Tool and official template. The final builder prefers the dated integrated 246-test report while retaining October 13 real-model observations as historical evidence. Future revisions require a new descriptive output name, verified links and full visual review; do not overwrite dated execution records. Environment examples and documented setup contain no real secrets.

[Recording/acceptance plan](RECORDING_PLAN.md), [cloud handoff](../docs/CLOUD_TEAMMATE_HANDOFF.md) and [provenance](../PROVENANCE.md) distinguish source verification, team deployment records and actual model tests. The final package is prepared for captain portal checks; no Submitted receipt is claimed.
