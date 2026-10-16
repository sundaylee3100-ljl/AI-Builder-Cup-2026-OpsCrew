# OpsCrew English cloud demo recording plan

Updated 2026-10-14. Target encoded duration: **165 seconds**, strictly below 180 seconds. Record the actual browser application on the accepted release. The October 13 API reports show 11 core and 14 safety/fixture checks, with overlap; these are separate from video playback, release identity, independent held-out acceptance and the remaining operational gates.

The owner confirms that the current YouTube video is the same as the content-rejected ZIP and needs to be remade. Do not submit that video link. Deployment identity has not yet been supplied. This plan prepares a new recording; no new cloud recording, model run or upload has been executed by the reviewer. See [the owner follow-up](../docs/acceptance/PR06-owner-followup-2026-10-14.json).

## Prerequisites and responsibilities

Teammate B verifies the deployed release identity and records the genuine public Cloud Run/Firebase application. Owner A checks spoken claims, proposal and captions against the evidence. Both play the final encoded file completely and verify public access in a signed-out browser. The observed product URL is `https://opscrew-883881551915.us-central1.run.app`; its October 13 API results do not prove that a later local revision is the deployed image. Do not show keys, account panels, authorization headers, confidential expenses or personal information.

Attribute the work accurately: “We created OpsCrew from zero in Google AI Studio Build. Gemini powers fact extraction, planning and review. Our teammate used Google Antigravity to assist Cloud deployment.” The Antigravity attribution comes from the owner's account of the teammate's work. The application currently accepts text and structured synthetic intake. Describe only demonstrated capabilities: explicit confirmation, policy validation and independent saved-case readback. Do not claim OCR, image parsing, automatic dispatch, payment approval, a strict monthly dollar cap, measured staff time savings, universal auditability or an SLA. A copyable notice draft, if shown, remains a draft and requires a current passing plan; it sends no message.

Use the synthetic missing-receipt example DEV-04. The interface's **Synthetic 04 is an employee-conflict example, not DEV-04**; Synthetic 05 uses a different employee/narrative. Click `Clear Form` and enter these exact fixture fields manually:

```text
Expense Description (Synthetic Narrative):
[SYNTHETIC] Parking fee $38.00 for SYNTH-EMP-100. Receipt lost.
Amount in USD: 38.00
Receipt Status: missing
Employee Identifier: SYNTH-EMP-100
```

Use the release model Gemini 3.1 Flash-Lite, subject to the actual deployed allowlist and returned model ID. Confirm the fixture in `aistudio-export-2026-10-07/fixtures/development-cases.json`; do not change data merely to obtain a preferred output. Keep all failed rehearsal attempts. Never replace a failed live run with an injected provider or splice results from different runs into one apparently continuous transaction. Obtain the cloud operator's approved scope before new account/model/case operations; prior three-workflow authorization has already been used.

## Storyboard and English narration

| Time | Screen / operator action | Spoken narration |
| --- | --- | --- |
| 00:00–00:15 | Team name, app title and actual public product URL | “We are OpsCrew. We built this expense exception prototype from zero in Google AI Studio Build. Gemini plans and reviews the handling steps. Our teammate used Antigravity to assist deployment.” |
| 00:15–00:35 | In Human Confirmation & Saved Case, click `Start visitor session`; wait for `Firebase visitor session`. `Clear Form`, then enter the exact DEV-04 fields above | “I explicitly start a Firebase visitor session. This synthetic example is a thirty-eight-dollar parking expense for employee SYNTH-EMP-100, with a missing receipt.” |
| 00:35–01:35 | Click `Analyze, plan & review`. Record the entire wait and actual response. After the response, expand `Run versions and completed-step telemetry` and show run/model identity and completed FACTS, PLANNER and REVIEWER attempts | “Gemini extracts facts, then a separately prompted Planner proposes handling steps. A Reviewer checks the proposal. This timer measures elapsed time. Completed role attempts appear after the response; it is not live progress inside each stage.” |
| 01:35–02:10 | Inspect validated facts, EVIDENCE_REQUEST, SYN-004 original text, required evidence, actual Reviewer PASS and current run/plan binding | “The current result requests receipt evidence. Clause SYN-004 asks for an itemized receipt or a written explanation. The passing plan and review grant no permission to create a case, reimburse or pay.” |
| 02:10–02:30 | Click `Prepare human confirmation`. Show the checkbox initially off and current run/plan. Read the authorization, check it, then click `Confirm & create synthetic case` | “I prepare human confirmation, inspect this specific plan, and explicitly authorize the synthetic exception record. The checkbox starts unchecked. I now submit that authorization.” |
| 02:30–02:45 | Show `Saved case verified by independent readback`, Case ID and OPEN details. Click `Refresh history`, then the same record's `Open & verify case`; show the matching Case ID | “Success appears only after a separate read of the saved record. I refresh this visitor's history and reopen the same case. OpsCrew does not approve reimbursement, issue payment or send a message automatically.” |

The schedule reserves 60 seconds for the real model chain, but actual latency may differ. If it exceeds the slot, record the complete run and edit only the wait interval, with a visible “Waiting interval shortened; actual wait: …s” caption. Preserve the original elapsed duration and disclose the edit in the description. Avoid narration that asserts a result before that result appears. If the workflow fails, record the safe failure and rehearse again within approved scope after diagnosis. Never caption an unavailable result as a success.

The normal successful UI hides the creation controls for an already verified plan. Do not pretend to click a second confirmation button to demonstrate idempotency; use history reopening in the main video and keep replay/recovery API evidence separate. Changing an input or model clears the current plan/review/confirmation. Demonstrate invalidation in a separate clip or after saving. Keep the same visitor session until readback finishes; do not end it or switch identity mid-run.

The three October 13 public workflows took 8.381–12.042 seconds. This small sample is an observation, not a latency promise. Its ten provider attempts include one first FACTS 503 followed by recovery; 11,680 known tokens exclude unknown usage from that failed attempt. Actual billed cost is unknown. Keep that failure in the evidence even if the final recorded run succeeds. A static slideshow explaining the design does not substitute for the required prototype-in-action recording.

Record additional short evidence clips separately: blocked contradictory sources, input invalidation, unknown-response recovery and visitor isolation. They may support review or an alternate cut; a second complete model chain is not required in the main 165-second video. Keep the main video understandable to a judge seeing the app for the first time.

## Captions, export and public link checks

Use the narration above as the editable subtitle draft. Generate the actual English SRT/VTT from the final audio, adjust timestamps after edits, and check spelling, case IDs and synchronization through full playback. Do not present draft captions as a verified transcript.

Export MP4/H.264 with clear browser text, audible narration and readable captions. Measure the encoded file's duration using `ffprobe`, a player or equivalent metadata tool. **The measured duration must be <180 seconds**, even if the planned cut is 165 seconds. Record resolution, duration, release SHA and SHA-256 of the final video in the release manifest.

Publish to an allowed public YouTube/Vimeo/Drive link only under the owner's authorized account. Verify full playback and captions while signed out. Add the actual product/video links to the proposal, checklist and final release manifest. Verify the public GitHub link separately. A local file, private Drive link, editor preview or uploaded draft is not a completed public video submission.

Before accepting the new cut, verify actual facts are 3800 cents/USD/missing/SYNTH-EMP-100 with no contradiction, the result is EVIDENCE_REQUEST/REVIEWABLE, Reviewer is PASS and the AI stages authorize no action. The expected decision cites SYN-001, SYN-002, SYN-004, SYN-007 and SYN-008 under synthetic-expense-usd-1.0.0. Do not substitute SYN-005. Compare the reopened record's case/run/plan identity and details. These are expected checks, not new executed results. Do not describe three prompted roles as three independent models or a live multi-agent scheduler.

## Proposal patch after cloud acceptance

Use the new cloud-evidence review proposal as the editing source. Update public team names from verified registration data and add the actual public video URI. Preserve the date and limits of recorded cloud evidence, including unverified source-to-image identity until it is actually established. Keep offline, emulator, public development and independent held-out results distinguishable. Historical packaging comprises 12 groups including nine HTTP checks, not 21 independent checks. Replace any old local screenshot only with a genuine new browser capture. Export a new PDF and PPTX revision, render every page, verify links and compare their hashes to the submitted files.

Sources: [official submission requirements](https://aibuildercup.com/themes.html), [stricter video duration FAQ](https://aibuildercup.com/Faqs.html), [cloud handoff](../docs/CLOUD_TEAMMATE_HANDOFF.md), [evaluation protocol](../docs/EVALUATION_PROTOCOL.md).
