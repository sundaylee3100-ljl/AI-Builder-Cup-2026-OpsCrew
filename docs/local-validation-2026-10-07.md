# Local packaging validation — 2026-10-07

Environment: Windows PowerShell, Node.js 24.14.0, npm 11.9.0. Commands run from `aistudio-export-2026-10-07/`. No real Gemini credential is used for local verification.

## Results

| Check | Result |
| --- | --- |
| Original `npm install --ignore-scripts --no-audit --no-fund` | Failed with ERESOLVE: Vite 8.3.3 requires esbuild ^0.27.0 or ^0.28.0; the export requests ^0.25.0. |
| Install after the disclosed esbuild ^0.28.0 packaging correction | Passed; generated `package-lock.json`. No force or legacy-peer-deps option used. |
| `npm ci --no-audit --no-fund` from the committed lockfile | Passed: clean dependency reinstall, 180 packages. |
| `npm test` | Passed: 6 top-level offline tests, 0 failed. The final test contains allowlist, timeout and retry scenarios using an injected local stub; no live Gemini call. |
| `npm run lint` | Passed: TypeScript check, exit 0. |
| `npm run build` | Passed: Vite 8.3.3 production frontend bundle, exit 0. |
| Source comparison with the Google ZIP | 13 of 14 original files remain byte-for-byte identical. `package.json` differs only in the esbuild dependency; the npm lockfile and repository documentation are additions. |
| High-confidence credential-pattern scan | No matches in publishable files; `.env.example` contains placeholders only. |
| No-key local HTTP startup smoke test (`node server.ts`, development mode) | Passed: frontend HTTP 200; `/api/config` HTTP 200, default `gemini-3.1-flash-lite`, key-configured false; `/api/analyze` returns explicit `MISSING_API_KEY` JSON (transport 500). Zero live Gemini calls. Test server stopped afterwards. |

Vite emitted a non-blocking advisory about `__dirname` in `vite.config.ts` and a future native configuration loader. The current build passes. The original generated configuration is retained.

## Evidence boundary

These local checks verify packaging and offline behavior. Real Gemini results were observed earlier in AI Studio, as recorded in [runtime evidence](runtime-evidence-2026-10-07.json) and [AI Studio acceptance](aistudio-acceptance-2026-10-07.md). No new local live Gemini success, Cloud Run deployment, billing activation or teammate acceptance is claimed here.

The original export archive SHA-256 is `ad716d8aeeb8dbc50c26cce639dfc6dadd20bd2b53730390543b9a17daf8efca`. See [provenance](../PROVENANCE.md) for the packaging change and origin of the app.
