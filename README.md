# OpsCrew: Expense Exception Plan & Review

OpsCrew helps an operator handle an expense exception with evidence and explicit human approval. Gemini extracts facts, drafts a policy-grounded plan and reviews it in three separate prompted stages. Fixed validators check the structured results. A person reviews and confirms an eligible current plan before the application saves and independently retrieves a handling case. Reimbursement and payments remain human responsibilities.

## AI Builder Cup 2026 submission

**Submitted — confirmed by the team on October 17, 2026.** This records the owner's confirmation; an independently verified portal receipt is not held in this repository.

| Material | Current version |
| --- | --- |
| Live prototype | [Open OpsCrew](https://opscrew-883881551915.us-central1.run.app) |
| Demonstration video | [Watch on YouTube](https://youtu.be/rdbS1XUNUjw) — **3:30.66**, matching the submitted form's 3–4 minute field |
| Official-template proposal | [13-page PDF](submission/OpsCrew_Proposal_Cloud_submission-final-2026-10-17.pdf) |
| Editable proposal | [PowerPoint](submission/OpsCrew_Proposal_Cloud_submission-final-2026-10-17.pptx) |
| Submission text and checklist | [Five fields and description](submission/SUBMISSION_FORM.md), [checklist](SUBMISSION_CHECKLIST.md) |

Captain: **Sunday Lee**. Theme: **Future of Work & Enterprise Productivity**. The owner accepted the final video and provided the hosted link. The new MP4 is kept locally and is distributed through that link rather than uploaded to GitHub. Reviewer verification of complete anonymous hosted playback is not claimed. [Proposal page/link checks](submission/OpsCrew_Proposal_Cloud_submission-final-2026-10-17.acceptance.json) and [material index](submission/README.md) identify the matching files.

## Try the workflow

1. Open the prototype, start a visitor session and enter synthetic expense text/form values.
2. Run **Facts → Planner → Reviewer**. Inspect the extracted facts, policy references, proposed next steps and review result.
3. For an eligible current plan, prepare confirmation, inspect the case preview, check consent and explicitly confirm.
4. Inspect the independently retrieved saved record. The same visitor can reopen case history.

An operator draft can be copied for human use; the application does not send it. The demo uses synthetic expense data and text/form entry, without receipt OCR.

## Google implementation

This is a new competition application created from zero in **Google AI Studio Build**. The team reports using **Antigravity** for Google Cloud deployment work.

- **Gemini:** server-side Facts, Planner and Reviewer stages, with deterministic validation between stages.
- **Cloud Run:** application server and frontend hosting.
- **Firebase Authentication:** visitor identity; **Firestore:** confirmed handling cases and persistent admission controls.
- **Model configuration:** Vertex AI with application-default service credentials, or an optional server-only Gemini Developer API key. Provider selection is explicit.

Visitors do not supply a Gemini API key. Credentials must stay out of browser code, proposals, videos and the public repository. See the blank [environment example](aistudio-export-2026-10-07/.env.example) and [cloud handoff](docs/CLOUD_TEAMMATE_HANDOFF.md). This implementation uses the Gemini SDK; it does not claim an ADK or hosted Agent Engine deployment.

## Local setup and checks

Use **Node 24 and npm 11**. From a fresh clone:

```powershell
git clone https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew.git
cd AI-Builder-Cup-2026-OpsCrew/aistudio-export-2026-10-07
npm ci
node --import tsx --test --test-concurrency=1 tests/*.test.ts
npm run lint
npm run build
npm run smoke:artifact
```

For local development, copy `.env.example` to `.env`, configure the intended server provider and run `npm run dev`. Model execution requires the corresponding authorized server credentials. Vite's static preview does not provide the full API. The checks above exercise local code and a native production artifact, rather than calling a live model.

The dated **October 16** validation passed **246/246 offline tests**, TypeScript checks, the production build and **12/12 native production-artifact groups**. Those groups include 9 HTTP checks and all 5 JavaScript chunks. The [integrated validation record](docs/acceptance/FINAL-integrated-validation-2026-10-16.json) preserves the source hashes, an earlier parallel timing failure and subsequent unchanged serial pass. These are historical executed checks, not a new cloud workflow or a Linux container build. Public fixtures and injected tests do not establish real-model or held-out accuracy.

The [deployment binding record](docs/acceptance/PR06-cloud-deployment-binding-2026-10-16.json) contains team-reported resource identifiers. Dated frontend/config observations do not independently attest backend image identity or new Vertex responses. Runtime limits and billing alerts also do not guarantee a monetary spending cap.

## Repository guide

- [`aistudio-export-2026-10-07/`](aistudio-export-2026-10-07/): maintained application, server, fixtures and tests.
- [`submission/`](submission/README.md): current proposal, hosted video link, captions and maintained builders.
- [`docs/`](docs/): contracts, deployment handoff and dated validation evidence.
- [Provenance](PROVENANCE.md) and [release manifest](RELEASE_MANIFEST.json): source/material identities and evidence boundaries.

Earlier video and proposal revisions remain dated history. The [duration decision](docs/acceptance/VIDEO-3to4-duration-rule-2026-10-16.md) preserves the public-page wording conflict and the actual submission field used for the current video. Credentials, dependencies, build output and private authoring workspaces are excluded from Git.
