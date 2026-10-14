# October 14 rules and submission-package review

Review date: October 14, 2026 (Asia/Shanghai). Initial candidate: [PR #6](https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew/pull/6), `release/final-verified-delivery`, head `51f99740fe488f74d8ef5de1b9368065ec1dadf1`. Accepted main before this review: `fbce9fdefa0baf1f82872c717e772576d4cccfaf`. Reviewer corrections are developed in an isolated checkout; final acceptance must bind the actual final Git head. A release branch title or screenshot does not itself establish deployment or submission.

## Current primary rules

The official homepage, Challenges, FAQ and homepage-linked published Terms were read again on October 14. The first direct Terms request was unavailable; its official homepage link subsequently opened the published document successfully. No login or account input was needed.

| Official requirement | Primary source | Package acceptance |
| --- | --- | --- |
| Google implementation | [Challenges](https://aibuildercup.com/themes.html), AI Tools and What you'll build | Google AI models such as Gemini/Gemma or the listed platforms, with a functional Google Cloud deployment through Cloud Run/GCP/Firebase; ADK/Antigravity are not exclusive mandatory choices |
| Four artifacts | [Terms](https://docs.google.com/document/d/e/2PACX-1vRm7ChZ6Ij9fG7uFDkxzUMpwgVeBmnQ6cMDnAIEEX84AiLBOOQ9cYbl3S5OzFBbcVb8TF55s-eVpiXb/pub), Technical Stack | End-to-end live URL, video strictly shorter than three minutes, public GitHub source, comprehensive architecture/business-case deck |
| English/PDF/sharing | [Challenges](https://aibuildercup.com/themes.html), submission/language sections | English code, documentation and presentation; deck converted to PDF; public YouTube, Vimeo or Google Drive demo link |
| Freshness | [Terms](https://docs.google.com/document/d/e/2PACX-1vRm7ChZ6Ij9fG7uFDkxzUMpwgVeBmnQ6cMDnAIEEX84AiLBOOQ9cYbl3S5OzFBbcVb8TF55s-eVpiXb/pub), Authenticity | Application code and original submission assets created during the event; accurate creation records and owner rights declarations |
| Eligibility | [FAQ](https://aibuildercup.com/Faqs.html), Team Composition; [Terms](https://docs.google.com/document/d/e/2PACX-1vRm7ChZ6Ij9fG7uFDkxzUMpwgVeBmnQ6cMDnAIEEX84AiLBOOQ9cYbl3S5OzFBbcVb8TF55s-eVpiXb/pub), Eligibility | Two to four members; all 21+, eligible professional/entrepreneur/startup and JAPAC-based, no students; one team and solution/theme per participant |
| Dates | [Timeline](https://aibuildercup.com/index.html), [FAQ](https://aibuildercup.com/Faqs.html) | Registration closed October 11; formation deadline October 14; prototype deadline October 18. Exact submission clock/timezone and portal limits remain unverified |

Today is the published formation deadline. Terms/FAQ wording about replacements overlaps the registration deadline; captain must check actual roster status rather than assume that a new addition is permitted. The Terms prevail over inconsistent promotional material and can be updated. Keep internal freeze October 16 and submission October 17 as buffers, not official cutoff times. Evaluation is October 19–November 6, with shortlist November 7 and Singapore finale December 4. [Timeline](https://aibuildercup.com/index.html), [Terms](https://docs.google.com/document/d/e/2PACX-1vRm7ChZ6Ij9fG7uFDkxzUMpwgVeBmnQ6cMDnAIEEX84AiLBOOQ9cYbl3S5OzFBbcVb8TF55s-eVpiXb/pub)

The selected theme is Future of Work & Enterprise Productivity. Scoring is technical/GenAI 40%, problem/impact 25%, innovation 25%, experience/design 10%. Use the current six-theme list and actual portal field; an old category example on the Challenges page is inconsistent with that list. [Themes and judging](https://aibuildercup.com/themes.html)

## Development-route statement

The final submission story is: a fresh blank Google AI Studio Build application, Gemini-backed workflows and Google Cloud deployment. The owner additionally reports that the teammate used Antigravity during deployment work. Original Build exports, hashes/prompts and actual Gemini runtime evidence support the first two parts. The particular Antigravity session is owner-reported, with no independent session export in this review. Later locally authored contributions remain disclosed in [provenance](../../PROVENANCE.md). Do not attribute every change to Build or claim that naming a Google tool verifies the deployed image.

## Candidate package and evidence boundaries

| Initial PR #6 item | Observation | Remaining action |
| --- | --- | --- |
| Public source | Exact PR #6/head supplied and isolated for review; PR #4 is already merged | Review/fix eligible changes, then record actual pushed/merged head |
| Offline JSON/journal | `dev-offline-verification.json`: injected identity/model, MemoryCaseStore, public development dataset, 350 assertions, 12 public cases, 12 repeat attempts and six controlled faults; real Gemini and production writes both zero | Keep its method label and source `1a532a39ecf8a26624aa3d40b302a63bcd7724b2`/digest `15bdf534400aa34271bd46a44f96cfa53d706f713830fd474fbcd3fdc5ccc348`; it is neither live accuracy nor independent blind-test evidence |
| Real cloud evidence | [October 13 core](DELIVERY-cloud-G3-2026-10-13.json) and [extension](DELIVERY-cloud-safety-and-fixtures-2026-10-13.json) contain actual bounded API execution | Cases are DEV-01, a custom G3 missing-receipt input and DEV-10. One case/readback/replay/isolation was exercised. Core and extension checks overlap; do not sum their counts as independent scenarios. These results cover that endpoint/time, not automatic deployment of PR #6 |
| Source-to-deployment identity | Initial candidate manifest has null accepted source/build/image/revision fields | Obtain an operator attestation for the final accepted source and actual image/revision; public config or labels alone cannot provide it |
| PDF/PPTX | Initial candidate's binaries are unchanged from the precloud review: PDF `e8d1b44ac5b6cc77a23f736839be95ba5cf03e102e5a8d174f914575fd0e4697`, PPTX `c5d1aa1663d23d53cd7a023593cbbd34225d8e86e41ed1cd8fdac27060afef58` | Packaging owner must finalize verified leader field, current claims/screens and three real links, then inspect new exports |
| Video candidates | Clean/Subtitled/original MP4s are present. The maintained video audit measures Subtitled at 168.181016 seconds | Duration satisfies the length rule; content/footage, narration, subtitle synchronization and selected final candidate require material review. This reviewer did not claim a full listening pass |
| Hosted video | Initial tracked package text has no actual YouTube/Vimeo/Drive video URL; `submission.video_url` is null | Captain/owner supplies or publishes the selected final video on a named supported host and verifies anonymous full playback. A Bilibili screenshot is not the named-host delivery evidence |
| Final portal entry | No observed Submitted receipt or verified portal schema/cutoff | Captain confirms account/eligibility/declarations and submits after the package is ready; record Submitted/ID/time afterward |

The initial interface's projected savings, latency/backlog and percentage labels need a transparent method and appropriate scope. Static numbers or screenshots labeled 100% are not a measured denominator. Reviewer source corrections and packaging checks are recorded separately; this file does not turn their planned changes into executed outcomes.

The provided template asks for team/leader/theme, idea/opportunity/features, process and architecture, technologies, prototype snapshots, benchmarking and GitHub/video/product links; wireframes and cost are optional. Confirm the actual portal template/version and file-size limits. A verified public leader name is needed for its field; private identity/employment documents belong in the captain's account process.

## Official delivery versus internal engineering

G1 through G7, eight sealed cases, four risk categories repeated three times, three consecutive main-demo runs, numeric-secret policy, USD40 goal and a specific manifest/JSON schema are team engineering standards. No reviewed public rule prescribes those exact counts or schemas. They help substantiate robustness and honest claims; missing one internal file is not automatically an official-format violation. A working prototype, truthful public demo and complete final materials remain required.

The Submitted receipt is a post-submission completion record. It cannot already exist for an entry that is still being prepared, and is not listed here as a pre-submission blocker. The current pre-submission gaps are final content, named-host video URL, confirmed portal fields/eligibility and consistent accepted release evidence.

## Completion order and audit scope

1. Finish candidate source review and appropriate checks; preserve the exact original head and first failures. Keep actual live/API evidence separated from fixtures and historical results.
2. Bind accepted source/build/image/revision, verify the final live visitor/confirmation/readback experience and update source/material claims from observed results within the owner's approved budget.
3. Complete final English PDF/PPTX/video, verify public product/Git/video links and provide a selected final material inventory with hashes and actual video duration.
4. Captain checks today's roster status, names/theme/rights/eligibility, actual cutoff/timezone and portal file limits. Login, consent, CAPTCHA and personal declarations require the human when encountered.
5. Submit through the authorized account after review, save the actual Submitted state and recheck public availability.

This reviewer edited only the isolated checklist, provenance and this final review note. No model/signup/case call, cloud/account change, publication, external message or Git commit/push was made. No temporary script, cache or intermediate artifact was created; inherited cleanup targets and user files were untouched. Other reviewers own their formal material/test results and their temporary cleanup.
