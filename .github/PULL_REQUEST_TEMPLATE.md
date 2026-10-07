## Problem and resulting behavior

What input or action exposes the issue, and what changes after this PR?

## Changes and source

- Changes:
- Source: Google Build export / local edit / documentation (identify which):
- Provenance update, if applicable:

## Validation

Record actual results; use **not run** and a reason when applicable.

| Check | Result / evidence |
| --- | --- |
| `npm ci` in `aistudio-export-2026-10-07/` | |
| `npm test` — offline, no real Gemini call | |
| `npm run lint` — TypeScript check | |
| `npm run build` — frontend build | |
| Local UI via `npm run dev` | |
| Optional live Gemini request | |

For a live request, record timestamp, model ID, synthetic scenario, outcome, and returned runtime telemetry. Omit credentials. Page loading, offline tests, and historical evidence do not establish a new live success.

## Review checklist

- [ ] Scope remains synthetic expense intake facts, missing information, and conflicts, or any scope change is explained.
- [ ] Secrets, `.env`, personal data, dependency/build output, and temporary files are absent from the diff.
- [ ] Relevant synthetic cases and error states were checked; remaining limitations are listed.
- [ ] Source origin and material local changes are accurately recorded.
- [ ] The other teammate has been requested to review before merge.

## Limitations or follow-up

List unresolved issues, or write “None known.”
