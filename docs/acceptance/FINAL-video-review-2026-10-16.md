# Final video review — 16 October 2026

**Decision: technical checks pass; this video is not yet approved as the final competition submission.** The recorded application walkthrough can be retained. The added title cards, closing card, and associated subtitles need factual corrections. This review does not establish an application defect.

## Reviewed asset and method

- Local input: `submission/Final-video.mp4`.
- SHA-256: `79b6bbef75b76ce236de25a4364fe911697c6c28acfc4f12681bd79441c90c43`.
- Size: 15,450,681 bytes. Duration: **132.040 seconds**, below the team's verified competition limit of 180 seconds.
- Video: H.264 High, 1920 × 1080, 25 fps, 3,301 frames, yuv420p. Audio: AAC LC, 48 kHz, stereo, 132.037 seconds.
- Both streams were fully decoded with FFmpeg; exit code 0 and no decoder errors. Audio signal measurement: mean −28.1 dB, maximum −8.1 dB. These measurements establish a non-silent decodable track, not intelligibility or spoken-word accuracy.
- Fourteen primary key frames across the duration, nine full-resolution detail frames, six additional gate-state crops, and three additional chapter-card frames were actually displayed and visually inspected. The repeated 58-second observation means 31 distinct timestamps were inspected. Fifteen representative frames are retained in the adjacent contact sheet.
- Extraction used FFmpeg image pipes and memory. Only this report, its JSON companion, and the contact sheet were written. No extraction directory, per-frame images, downloaded media, or model calls were created.
- **No full audio listening/transcription was performed.** Burned-in English captions were visually read at sampled frames. Complete caption coverage, timing, pronunciation, and word-for-word agreement with audio remain unverified.
- The supplied hosted URL is `https://youtu.be/8MACVIPWCt8`. This agent did not open it, play it, or establish identity with the local file.

## What the actual footage supports

1. Application frames display `https://opscrew-883881551915.us-central1.run.app` and the current UI with human-confirmation and saved-case verification sections. This is recorded evidence, not a fresh independent availability or deployed-source verification. Root separately inspected the teammate's recording script and established that its apparent address bar is a DOM overlay rather than native browser chrome; a displayed URL alone does not prove network origin or source identity.
2. The user starts a Firebase visitor session, manually enters a **USD 38 parking expense with a missing receipt and SYNTH-EMP-100**, and runs `gemini-2.5-flash`. The on-screen label `Synthetic 04` is a separate employee-identifier-mismatch scenario; it was not the demonstrated selection. The early caption's `DEV-04` should be replaced with `a synthetic missing-receipt example` unless fixture identity is separately established.
3. FACTS, PLANNER, and REVIEWER completed-step telemetry is displayed; visible durations are 2.74, 2.88, and 6.37 seconds. These are one recorded run's server-reported observations, not an SLA or a benchmark distribution.
4. The result is `REVIEWABLE`, deterministic branch `EVIDENCE_REQUEST`, reviewer `PASS`, with an explicit copy-only operator communication draft. A visible citation list includes `SYN-004`. The footage does not show an OCR operation, automatic message dispatch, reimbursement approval, or payment execution.
5. At about 87 seconds the user prepares human confirmation; at 89–91 seconds the confirmation preview and input/plan SHA-256 values are visible; at 92 seconds the checkbox is visibly checked and `Confirm & create synthetic case` is activated. The blue cursor obscures the initial checkbox at sampled preview frames, so this visual review does **not independently prove its unchecked default**. The subsequent saved-case state is visible.
6. At 94–98 seconds the application reports `Saved case verified by independent readback`; at about 108 seconds `Open & verify case` is activated from saved-case history. Matching displayed fields include USD 38, SYNTH-EMP-100, receipt `missing`, case type `EVIDENCE_REQUEST`, action `create_exception_case`, status `OPEN`, and the same case/run/plan identifiers.
7. The displayed saved-case ID is `case_766f41e6495acdc3ac35d68c81c4a2381059748b98fbcc51644e7c87f05ddeba`; plan ID `plan_c213aad8-fb40-4a0d-bf9a-13b7a373b94f`, version 1; creation time `2026-10-15T11:53:31.376Z`. These are synthetic case identifiers visible in recorded footage, not credentials.

## Corrections required before publishing as the final video

| Visible location | Unsupported or misleading statement | Required correction |
| --- | --- | --- |
| Around 39 seconds, chapter 02; captions around 38–58 seconds | `immutable telemetry`; title card asserts Vertex AI execution while UI exposes the model but not the active provider | Say `completed-step telemetry` and `Gemini`; name a specific backend provider only when tied to deployment evidence. |
| Around 63 seconds, chapter 03; closing card | `Zero-hallucination compliance enforcement` / `Zero-hallucination SYN-001 ~ SYN-008` | Describe `deterministic synthetic-policy checks with validated AI outputs`. Do not claim universal absence of model hallucination. |
| Around 83–85 seconds, chapter 04 | `signed, immutable case creation with cryptographic audit binding` | Say `explicit human confirmation bound to the current input and plan`; SHA-256 comparison is not a digital signature or tamper-proof audit ledger. |
| Around 101 seconds, chapter 05 | `perfect state parity across visitor sessions`, `Audit Immutability`, permanently bound immutable trail | Say `separate server readback and same-visitor history verification for this synthetic case`. This footage uses one visitor and does not establish cross-session access, permanence, or immutability. |
| Around 105–108 seconds, burned-in subtitle | User executes a read `directly from Firestore`, proving cryptographic consistency and perfect audit parity | Say `the browser requests the saved case through the authenticated server API and compares the returned fields`. Direct client Firestore access is intentionally denied. |
| Around 118–132 seconds, closing card | `Target <15s SLA`, `~8–12s measured ... replacing 48h manual backlog`, `<15s CONSENSUS SLA` | Remove SLA and 48-hour claims. If retaining a number, identify it as one recorded sample with its measured scope, not an end-to-end service commitment. |
| Closing card | `$40 Monthly Budget Cap` / `$40 CAP MONTHLY GUARDRAIL` | Label USD 40 as a **team budget target**, if retained. Token admission and Google Cloud budget alerts do not prove a billing hard stop or complete monthly cost cap. |
| Closing card | `100% AUDIT READBACK PARITY`, `Cryptographic Parity ... guarantees data integrity` | Say `one synthetic saved case verified by separate readback and history reopen`; avoid universal percentage or cryptographic guarantee. |
| Closing card | `Native Vertex AI & Gemini Flash 2.5 failover` | Describe supported configuration modes only; do not imply automatic provider failover unless that behavior and a failover event are verified. |
| Closing card | `232/232 Passing Tests` as an undated current total | Use the final reviewed source's current test evidence and date, or omit the total. The previously reviewed source passed 236 offline tests; artifact smoke checks are a separate result. |
| Around 25–28 seconds, caption | `synthetic exception DEV-04` | Call this the manually entered missing-receipt example. Do not confuse development fixture IDs, `Synthetic 04`, and policy clause `SYN-004`. |

The recording contains useful real UI evidence. Reuse that footage and replace the claims around it; a new model run is not required merely to correct cards/captions. The final corrected audio must match the corrected captions. If its speech contains the same inaccurate claims, replace or re-record those voice segments.

## Final video acceptance checklist

- [x] Local asset duration is strictly below 180 seconds.
- [x] Video and audio fully decode.
- [x] Real application walkthrough includes AI result, human confirmation, saved-case readback and history.
- [x] Actual synthetic-case fields remain consistent across the inspected workflow and saved-case frames.
- [ ] All chapter cards, closing claims, captions and narration corrected as above.
- [ ] Final current offline-test total, date and scope align with the reviewed Git source.
- [ ] Full final audio listened to and caption timing/coverage checked.
- [ ] Hosted final video anonymously played through in full and identity/content matched to the approved local file.
- [ ] Final hosted video URL, file hash and duration updated in submission materials.

## Scope and cleanup

This review did not call production APIs, create identities or cases, consume Gemini quota, modify the application/video, inspect cloud accounts, or establish Git-to-build-to-image-to-revision mapping. The retained contact sheet is a necessary review artifact. All extracted frame buffers stayed in memory; no temporary files or directories were created for the source review. Two cropped, unchanged UI evidence images were subsequently retained for the proposal: `FINAL-video-ui-plan-2026-10-16.png` from 75 seconds (1325 × 870 crop at 305,42) and `FINAL-video-ui-savedcase-2026-10-16.png` from 96 seconds (1325 × 445 crop at 305,442). These crops omit the old HUD/caption, without rewriting fields or statuses. The separate corrected-video builder and its private work directory have their own build/QA cleanup record.
