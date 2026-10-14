# Submission checklist

Updated October 14, 2026 (Asia/Shanghai). Review target: [PR #6](https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew/pull/6), initial head `51f99740fe488f74d8ef5de1b9368065ec1dadf1`, branch `release/final-verified-delivery`. S3 and the reviewed continuation are already merged through PR #3 and PR #4; accepted main before this review is `fbce9fdefa0baf1f82872c717e772576d4cccfaf`. PR #6 is a new candidate; its title does not establish final acceptance or deployment.

Read the [current rules/package review](docs/acceptance/DELIVERY-rules-and-package-review-2026-10-14.md), [provenance](PROVENANCE.md), [cloud handoff](docs/CLOUD_TEAMMATE_HANDOFF.md) and [deployment runbook](docs/PRECLOUD_DEPLOYMENT.md). Original dated source/test reports remain historical evidence.

## Official requirements and dates

- A functional prototype using Google AI models or the specified agentic platforms, deployed primarily on Google Cloud via Cloud Run/GCP/Firebase. Gemini and the Google AI Studio Build foundation satisfy the declared technology route; ADK/Antigravity are not exclusive mandatory tools. [Requirements](https://aibuildercup.com/themes.html)
- Public source repository, an end-to-end live product URL, a comprehensive architecture/business-case deck converted to PDF, and a public demo video with actual encoded duration **strictly below 180 seconds**. The named video hosts are YouTube, Vimeo and public Google Drive. Use a named host for final delivery; a local MP4 or screenshot of another platform does not establish that link. Submission code, documentation and presentations are English. [Requirements](https://aibuildercup.com/themes.html), [FAQ](https://aibuildercup.com/Faqs.html)
- Fresh application code and original submission assets created during the hackathon timeline; keep creation/source evidence and rights declarations accurate. [Official Terms](https://docs.google.com/document/d/e/2PACX-1vRm7ChZ6Ij9fG7uFDkxzUMpwgVeBmnQ6cMDnAIEEX84AiLBOOQ9cYbl3S5OzFBbcVb8TF55s-eVpiXb/pub)
- **Team formation: October 14, 2026. Prototype submission: October 18, 2026.** Registration closed October 11. Published pages do not establish an exact cutoff clock/timezone. Confirm the actual portal today. Internal buffers remain freeze October 16 and submit October 17; an earlier portal deadline takes precedence. [Timeline](https://aibuildercup.com/index.html), [FAQ](https://aibuildercup.com/Faqs.html)

Future of Work & Enterprise Productivity is the team's selected theme. Official weights are technical/GenAI 40%, problem/impact 25%, innovation 25%, and experience/design 10%. Confirm the actual portal theme rather than using the Challenges page's inconsistent legacy category examples. [Themes and judging](https://aibuildercup.com/themes.html)

## Captain and account checks

- [ ] Confirm the registered two-to-four-member team, each age 21+, eligible professional/entrepreneur/startup, based in JAPAC, with no student members; one team/solution/theme per participant. Keep identity/employment documents private. [Eligibility FAQ](https://aibuildercup.com/Faqs.html)
- [ ] Verify roster status today, the registered team/leader names, required declarations and selected theme. The Terms/FAQ use overlapping registration/formation wording; do not infer permission for a late roster change without the portal's confirmation.
- [ ] Inspect actual portal cutoff/timezone, template version, PDF/file-size limits, video/link fields and final-submit behavior. These have not been independently verified.
- [ ] Confirm submission asset rights and creation dates; confirm the user-reported teammate use of Antigravity without attributing every local extension to Google Build.
- [ ] Confirm approved project, billing/credits, runtime identity, region/database, rules/indexes, model access and budget responsibilities. New account/paid configuration requires the owner's participation; existing local or bounded test authorization does not enable unrestricted cloud operations.

For login, consent, CAPTCHA, payment or personal declarations, ask the authorized person as soon as intervention is required. Do not bypass those controls. Browser login state applies to the current session.

## Verified evidence and remaining package work

| Item | Current evidence | Remaining acceptance |
| --- | --- | --- |
| Google Build origin | Blank AI Studio Build app created October 7; original archive hashes and prompts retained in provenance | Captain confirms final source/asset declarations |
| Public GitHub | PR #4 merged to main; PR #6 identified by URL and exact initial head | Complete review, merge eligible changes and record actual final accepted SHA |
| Local engineering | Current corrected PR #6: 236/236 tests, strict type checks, build and 12 native production-artifact groups pass; prior 232 tests and unchanged-backend emulator/evaluation reports remain dated evidence | Real browser clipboard/asynchronous interaction and current deployed-release checks remain separate |
| New public-fixture JSON | `docs/acceptance/dev-offline-verification.json`: 12 public cases, 12 risk-repeat attempts, six faults, 350 assertions; injected identity/model, zero real Gemini and production writes | Treat as contract regression evidence, not cloud accuracy or independent held-out validation |
| Real deployed workflow | [October 13 G3](docs/acceptance/DELIVERY-cloud-G3-2026-10-13.json) and [fixture/safety report](docs/acceptance/DELIVERY-cloud-safety-and-fixtures-2026-10-13.json): bounded DEV-01, the maintained G3 runner's missing-receipt input, and DEV-10, plus one synthetic case, independent readback/replay/isolation and negative checks | Evidence covers that deployed endpoint at that time; obtain candidate source/build/image/revision binding and verify any changed release |
| Product URL | `https://opscrew-883881551915.us-central1.run.app`; restored probes and bounded API execution observed October 13 | Verify final release/visitor UI and availability; no new cloud configuration is implied |
| Proposal PDF/PPTX | Current thirteen-page English official-template review contains Sunday Lee and repository/product/YouTube links; rendering and all three hyperlinks checked | Keep the proposal consistent with finally accepted footage and deployed release |
| Video files | Initial PR #6/owner archive candidates measure 168.181016 seconds but fail content review; excluded from the current submission tree. Owner URL: https://youtu.be/h53-tucE7ig ; public page metadata verified | Select truthful current-cloud footage, complete playback/listening/subtitle review, and verify hosted-video correspondence; metadata and duration alone are insufficient |
| Release identity | `RELEASE_MANIFEST.json` records the corrected source and current proposal hashes; historical identities retained | Bind the reviewed implementation commit and actual deployment build/image/revision; complete video acceptance and post-submission receipt |
| Portal submission | No actual Submitted receipt observed | Complete the package and captain's portal checks, submit with authorization, then save actual Submitted/ID/time |

## Before submission

- [ ] Final PDF, video, README and deployed UI describe the same verified release. Claims distinguish measured results, controlled tests, hypotheses and future work; no unsupported OCR, notification, SLA or ROI claim.
- [ ] Product, public GitHub, named-host video and any Drive links work without the team's private login. The video can be watched completely.
- [ ] Final deck/PDF has verified leader/team fields and product/video/GitHub links. All PDF pages and hyperlinks are checked; editable source is retained.
- [ ] Final video has measured duration below 180 seconds, intelligible English narration, appropriate subtitles and truthful footage/disclosed editing.
- [ ] Appropriate source tests/build/runtime checks, credential scan and final cleanup are complete; formal tests/evidence and user materials are retained. Do not retry inherited previously rejected cleanup targets.
- [ ] Both teammates review final policy/claims/materials and cloud source/revision/identity/limits/readback evidence. Confirm portal file limits, roster/theme and declarations.

## Team engineering acceptance

G1 through G7, eight independently sealed held-out cases, four risk categories repeated three times, three consecutive main-demo runs, numeric secret-version policy and the USD40 management target are team standards. The published contest rules do not prescribe those exact counts or JSON schemas. Complete the team's agreed safety work with correct method labels; do not turn missing internal files into an invented official-format violation. USD40 and budget alerts are not a certified currency spending cap.

- [ ] Record actual release stability, failure/recovery and persistent quota behavior within the approved budget; retain all failures.
- [ ] Independently execute the agreed hidden-set/repeat protocol if claiming those results; public fixtures are not hidden cases.
- [ ] Review maintenance and budget ownership through the published October 19–November 6 evaluation period.

## At and after final submission

- [ ] Captain confirms final fields and declarations and performs the authorized portal submission.
- [ ] After submitting, save the actual Submitted state, receipt/ID/time and frozen material/source identities. This receipt is a post-submission record, not a file that must already exist before submission.
- [ ] Recheck final public links and keep the demo available during evaluation. Retain an owner contact and a bounded incident/restore plan.

If shortlisted, follow the actual notice for the November 7 announcement and December 4 Singapore finale; only two members may attend and visas are their responsibility. [Timeline](https://aibuildercup.com/index.html), [FAQ](https://aibuildercup.com/Faqs.html)
