# Corrected submission video — offline QA, 16 October 2026

**Result: local technical and visual checks pass. Full human audio listening and publication of the corrected video remain pending.** The owner-supplied video and the hosted `8MACVIPWCt8` video must not be treated as this corrected asset.

## Deliverables

- Video: `submission/OpsCrew_Submission_Demo_2026-10-16.mp4`.
- Duration: **103.981333 seconds**; 1920 × 1080 H.264, 25 fps, 2,599 video frames; AAC stereo at 48 kHz. The video stream itself is 103.960 seconds; AAC/container padding accounts for the small difference.
- Size: 10,012,205 bytes. SHA-256: `f9ca540644f96677aed1833cbbcc83d71e69cedf0bbc336acad8a43fb5613650`.
- Matching `.srt` and `.vtt` contain 14 cues and the same 199-word narration used to synthesize audio.
- Maintained builder: `submission/build-reviewed-demo.mjs`.
- Build evidence: `docs/acceptance/FINAL-video-corrected-build-2026-10-16.json`; review contact sheet: `docs/acceptance/FINAL-video-corrected-contactsheet-2026-10-16.png`.

## What changed

All original opening slides, five chapter cards, closing slide, and original audio were removed. The five recorded application portions remain in their original order and at their original speed. Two new factual cards introduce the scope and provide the public source/prototype links. The revised narration avoids the source video's unsupported SLA, 48-hour improvement, billing hard-cap, automatic failover, universal parity, cryptographic guarantee, immutable-ledger, and direct-client-Firestore claims.

The old top HUD was a DOM overlay, not native browser chrome. Its entire 1920 × 42 area is replaced with `RECORDED WALKTHROUGH - 15 OCT 2026 - SYNTHETIC DATA`. This label deliberately does not claim independent verification of the URL or source identity. The old burned-in captions are replaced in the existing lower callout area (x 514, y 918, width 894, height 108). The visible confirmation checkbox, case ID, save result, and right-side history verification control remain observable. No new success state, input value, plan, case, or model result was drawn into the application.

The new narration was generated entirely offline with Windows `System.Speech`, `Microsoft Zira Desktop` (en-US), at rate 3. Its total synthesized speech duration is 67.614 seconds within the 103.96-second edit, allowing silent viewing intervals. Each spoken chunk was measured before placement. The same text and placement produce the burned-in captions and sidecar timestamps. This establishes construction consistency; it does not substitute for listening to the rendered speech.

## Edit decision list

Times in this table refer to intended video-frame timing before the approximately 21-millisecond output video timestamp offset introduced by AAC/container packaging.

| Output interval | Source interval | Content |
| --- | --- | --- |
| 0.00–14.00 | New native text card | OpsCrew purpose, human control, synthetic scope and Google platform route |
| 14.00–28.00 | 24.04–38.04 | Visitor session and manually entered missing-receipt example |
| 28.00–47.00 | 42.04–61.04 | Model processing and three completed-role telemetry/results |
| 47.00–64.00 | 65.04–82.04 | Evidence request, passing review and copy-only operator draft |
| 64.00–77.00 | 86.04–99.04 | Prepare confirmation, explicitly check consent, save and independent readback |
| 77.00–91.96 | 103.04–118.00 | Same-case history reopen and verification |
| 91.96–103.96 | New native text card | Public source/prototype links and no automatic reimbursement/payment |

## Verification performed

- [x] Builder syntax checked with Node.js.
- [x] Source SHA-256 verified before and after encoding; original owner file unchanged.
- [x] Complete output audio and video decoded without errors (exit code 0).
- [x] Strict duration check: 103.981333 < 180 seconds.
- [x] Non-silent new audio measured: mean −24.9 dB; maximum −5.5 dB.
- [x] Fourteen SRT and VTT cues parse in strictly increasing, nonoverlapping order within the asset duration; all sidecar texts exactly match the narration input.
- [x] All 14 cue-midpoint image states inspected through the retained contact sheet, with 11 full-resolution key states additionally inspected. Initial multiline control-glyph rendering was corrected in the same builder, and the final render contains readable lines without those glyphs in inspected states.
- [x] The inspected current input, proposed plan and saved-case states consistently show USD 38, SYNTH-EMP-100 and a missing receipt, with `EVIDENCE_REQUEST`, `OPEN` and the same recorded case/run/plan identifiers.
- [x] The output retains human preparation, a checked confirmation, the independent-readback success state, and history `Open & verify case`.
- [x] Owner input hash validated using `--check-input-only`.
- [x] Alternate preserved Git input `submission/Original_Recorded_Demo_2026-10-16.mp4` accepted by `--input=... --check-input-only`, hash `cb64b670e057709cdcb85aa55dde7e2f05fbc3eb3490042cd13eacd4c36a6772`. A first probe during the root path handoff received ENOENT; the completed flat path then passed. No second full encoding was needed.
- [ ] Human listens to the complete new voice track and confirms intelligibility, pronunciation, sentence agreement and satisfactory pacing.
- [ ] Publish this corrected asset, then anonymously play it through in full and match the hosted content to this file.
- [ ] Replace the submission/deck video link with the approved corrected public URL.

## Reproduction and boundaries

On Windows with Node.js, FFmpeg/FFprobe, Segoe UI fonts and the installed Microsoft Zira Desktop voice, run `node submission/build-reviewed-demo.mjs`. The builder prefers the local owner's `submission/Final-video.mp4`; without that file it falls back to the preserved Git input `submission/Original_Recorded_Demo_2026-10-16.mp4`. `--input=... --check-input-only` validates an explicit path without generating output or temporary files. The two approved containers have different whole-file hashes; no byte-identity claim is made. Their elementary-stream equivalence was separately checked by the root reviewer. After the successful encode, the builder's fallback path was updated to the final flat preserved-input location; no rendering or narration logic changed. The build evidence retains the encode-time script hash and records the amended current hash separately.

No production request, Firebase identity/case creation, Gemini call, paid TTS call, network media download, browser action or YouTube upload occurred in this offline edit. The underlying footage is teammate-supplied recorded evidence. This edit does not independently establish its backend run, cloud source/image/revision mapping or current service availability.

Only one private work directory was used: `.review-media-20261016`. It contains local text/filter files, WAV narration and temporary encoded segments. Its cleanup result is recorded in the companion QA JSON; it is not part of the submission package. Root coordinates that deletion after all media QA, so the media agent will not issue a competing deletion or retry a rejected removal.


## Post-QA cleanup observed by root

The stopped, marker-owned `.review-media-20261016` directory was sent to the Windows Recycle Bin after final-output validation. A subsequent existence check returned false. The reviewed MP4, captions, builder and formal evidence remain intact. The previously rejected presentation-workspace removal was not retried. This cleanup does not certify human listening or public playback.
