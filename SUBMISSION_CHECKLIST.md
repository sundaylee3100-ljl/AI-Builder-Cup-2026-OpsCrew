# Submission checklist

Updated: 2026-10-09 (Asia/Shanghai). S0/S1 began on October 9 and are in progress; original plan approval was on October 8. A checked item requires the stated evidence; planned filenames and URLs are not completed deliverables. See [scope](SCOPE.md), [workboard](docs/DELIVERY_WORKBOARD.md), and [evaluation protocol](docs/EVALUATION_PROTOCOL.md).

## Rules and dates

Public requirements were rechecked during S0. The package needs a functional Google Cloud prototype using Google AI or the specified platforms, a public GitHub repository, a proposal deck converted to PDF, and a public demo video. Submission code, documentation, and presentations must be English. Use a working Cloud Run/Firebase URL. [Challenges and requirements](https://aibuildercup.com/themes.html), [FAQ](https://aibuildercup.com/Faqs.html)

Apply the stricter video rule: **encoded duration <180 seconds**, with an internal target of 165 seconds. The public timeline lists **2026-10-18** for prototype submission and also says to submit before October 18. No exact clock time or timezone is published there. Internally freeze on **October 16** and submit on **October 17**, in Asia/Shanghai; an earlier portal deadline takes precedence. [FAQ](https://aibuildercup.com/Faqs.html), [official timeline](https://aibuildercup.com/index.html), [official terms](https://docs.google.com/document/d/e/2PACX-1vRm7ChZ6Ij9fG7uFDkxzUMpwgVeBmnQ6cMDnAIEEX84AiLBOOQ9cYbl3S5OzFBbcVb8TF55s-eVpiXb/pub)

## S0 prerequisites

- [x] Delivery scope and the USD 40 budget management target approved by the user; see [scope](SCOPE.md). First new paid-resource configuration still requires separate confirmation.
- [x] Fresh Google Build baseline and historical evidence identified at `c7adfd6`; see [provenance](PROVENANCE.md).
- [x] Public deliverables mapped below; this does not certify their final completion or accessibility.
- [ ] Captain verifies 2–4 members, each age 21+, based in JAPAC, eligible professional/entrepreneur/startup status, no student members, and one team/solution/theme per participant. Keep personal evidence private. Verify team data before the October 11 team-formation close. [Eligibility FAQ](https://aibuildercup.com/Faqs.html)
- [ ] Captain verifies actual registration/team details, required declarations, and the single portal theme matching Future of Work & Enterprise Productivity.
- [ ] Read the actual submission portal: exact deadline/timezone, required fields, template version, PDF/file limits, video/link fields, and final-submit behavior. All are currently unknown; do not infer them from this checklist.
- [ ] Verify Google project ID, account access, region, Firebase setup, billing/credits, IAM, model availability and current pricing; store no secrets in this repository.
- [ ] Present the first paid-resource configuration and obtain the user's separate confirmation before enabling new paid resources.
- [ ] Verify the logo/other retained assets' creation dates and use rights before including them in new materials.

The browser connection is currently unavailable after three connection attempts; portal/account checks await the user's reconnection. No account, eligibility, portal, cloud or billing verification is implied. Login, CAPTCHA, payment, eligibility, and personal declarations require the captain's participation when encountered. Stop that account-dependent step immediately and request help; do not bypass it. Login state is only valid for the current session. Independent local development can continue while these items remain pending.

## Deliverable and evidence map

| Requirement / internal acceptance item | File or URL | Current status / completion evidence |
| --- | --- | --- |
| Public source | [GitHub repository](https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew) | Historical baseline published; final release commit and anonymous access recheck pending |
| Reproducible English documentation | [README.md](README.md), [PROVENANCE.md](PROVENANCE.md), this checklist, `docs/DEPLOYMENT.md`, `docs/EVALUATION.md` | Baseline docs exist; new release/deployment/evaluation docs and validation pending |
| Working Google Cloud prototype | Final Cloud Run/Firebase URL, to be recorded in `RELEASE_MANIFEST.json` | Pending; AI Studio/editor/local preview is not the final deployment |
| Proposal PDF and editable English deck | `submission/OpsCrew_Proposal.pdf` and editable source | Pending; follow actual portal/template requirements; render every PDF page and check links |
| Public English demo | Final YouTube/Vimeo/public Drive URL; video and English subtitles in `submission/` | Pending; final-version operation, full playback, measured <180 s, anonymous access |
| Evaluation and safety evidence | `docs/EVALUATION.md`, machine-readable results and redacted run/case evidence | Pending; protocol preregistered in [EVALUATION_PROTOCOL.md](docs/EVALUATION_PROTOCOL.md) |
| Release identity | `RELEASE_MANIFEST.json` | Pending; commit, cloud revision, policy/prompt/model versions, material hashes and three public URLs |
| Stage acceptance | `docs/acceptance/Sxx-<stage>.md` | Pending; itemized outcome, versions, evidence, failures, measurements and cleanup |
| Formal submission | Private portal receipt/status capture; redacted submission record | Pending; uploaded files or saved draft alone do not count as Submitted |

## Final release and submission gates

- [ ] New-version live Gemini, cloud end-to-end, ownership, approval/revision, concurrency/idempotency, failure/recovery, and readback gates pass; report emulator/offline checks separately.
- [ ] All critical safety checks pass, all 8 independent held-out cases pass their key semantic assertions, four high-risk cases pass three repetitions each, and the main demo succeeds three consecutive times.
- [ ] English PDF, video, README and screenshots describe the same final version and make only measured, evidenced claims.
- [ ] Public product, GitHub, video and any Drive links work in a signed-out/incognito session without a team-private Google login.
- [ ] PDF renders cleanly with clickable links; video playback, audio, subtitles, encoded duration and disclosed editing are verified.
- [ ] Clean install, appropriate tests, type checking, production build, secret scan, and delivery-time temporary-file scan/cleanup complete.
- [ ] Captain/team completes cross-acceptance and verifies final portal fields, team/theme, declarations and URLs.
- [ ] Portal shows Submitted; receipt/ID/time and final version snapshot saved, then public URLs rechecked.
- [ ] Evaluation-period availability and budget responsibilities through November 6 are confirmed; do not disable required services after submitting.

The official scoring weights are 40% technical/Gen AI, 25% problem/impact, 25% innovation, and 10% experience/design. These safety and evaluation thresholds are team engineering choices. [Judging criteria](https://aibuildercup.com/themes.html)

If shortlisted, prepare a separate finale demo, Q&A and failure plan from the actual notice. The published dates are November 7 for the shortlist and December 4 for the Singapore finale; only two members may attend, and visas remain their responsibility. Do not invent stage duration or additional deliverables before notification. [Timeline](https://aibuildercup.com/index.html), [finale FAQ](https://aibuildercup.com/Faqs.html)
