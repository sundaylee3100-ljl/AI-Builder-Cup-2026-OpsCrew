# Submission materials and cloud evidence review

OpsCrew is a fresh application created from zero in Google AI Studio Build during the competition. Gemini 3.1 Flash-Lite performs fact extraction and separately prompted Planner and Reviewer stages. The owner reports that the teammate used Google Antigravity to assist Cloud deployment. The original official template and the owner-reported Gemini-generated team logo are in `assets/`.

The new **Cloud evidence review** PDF/PPTX contain thirteen substantive slides following the official template. They distinguish the October 13 recorded cloud API checks from historical local/injected tests. The latest `cloud-public-links-review-2026-10-14` revision includes the owner-supplied public captain name Sunday Lee and YouTube URL, alongside the recorded product URL. Final footage acceptance, signed-out playback, source-to-image identity, independent held-out evaluation and remaining resource controls must be completed before declaring a final submission ready. A public URL does not validate the video's claims. Earlier proposal binaries remain historical and are not overwritten.

`build-proposal.mjs` is one maintained authoring script. It imports the official template and preserves the artwork, original fonts and slide size. Text, tables and diagrams remain editable in the PPTX. The PDF uses matching 192-dpi page images and clickable repository/product/video links. Its text is not searchable; edit the PPTX for final changes. A clearly labeled historical local screenshot remains on the interface page. The cloud result page contains genuine recorded response evidence, not a fabricated browser screenshot. Actual final browser recording remains necessary.

The script uses the bundled Artifact Tool, not application runtime dependencies. Set `OPSCREW_DOCUMENT_RUNTIME` and `OPSCREW_PRESENTATIONS_SKILL` for another equivalent runtime. From the repository root, use new output revisions and the recorded source files:

```powershell
$env:OPSCREW_PUBLIC_CAPTAIN_NAME = 'Sunday Lee'
$env:OPSCREW_PUBLIC_VIDEO_URL = 'https://youtu.be/h53-tucE7ig'
node submission/build-proposal.mjs docs/acceptance/PR04-build-integration-2026-10-12.json cloud-public-links-review-2026-10-14 docs/acceptance/DELIVERY-cloud-G3-2026-10-13.json docs/acceptance/DELIVERY-cloud-safety-and-fixtures-2026-10-13.json
```

Optional `OPSCREW_PUBLIC_CAPTAIN_NAME` and `OPSCREW_PUBLIC_VIDEO_URL` accept only verified public values. A supplied video URI does not automatically prove anonymous access or correct footage. All new slides and independently rerendered PDF pages require actual visual inspection. Check the editable deck in PowerPoint or the submission authoring tool before final export. The October 12 material acceptance applies only to its historical hashes. Keep private authoring previews separate from final files and bind final submitted materials to SHA-256.

Follow [the recording plan](RECORDING_PLAN.md), [cloud handoff](../docs/CLOUD_TEAMMATE_HANDOFF.md) and [submission checklist](../SUBMISSION_CHECKLIST.md). A review proposal or local video is not final G6 acceptance or a portal Submitted receipt.


## Unaccepted candidate footage

The videos submitted in original PR head 51f99740fe488f74d8ef5de1b9368065ec1dadf1 are review inputs, not approved final deliverables. Their technical encoding is valid but their content does not match the claimed current cloud demo. Candidate media/source are excluded from the current submission index; no supplied local file was deleted. See [the video audit](../docs/acceptance/PR06-video-review-2026-10-14.md) and the owner archive. The current public YouTube link is supplied by the owner and has valid public page metadata, but footage correspondence and actual playback remain pending.
