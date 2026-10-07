# OpsCrew — Initial AI Studio Build Prompt

Prepared and submitted on 2026-10-07 in the user's logged-in Comet session, starting from a blank Google AI Studio Build application. Application creation and an English runnable preview were subsequently confirmed at https://aistudio.google.com/apps/e8a0fb37-f747-45d2-b376-b832ac7fe09f?showPreview=true&showAssistant=true . The initial submission was temporarily unconfirmed because screenshot/click control failed; that was an earlier observation, not the current creation state. This file contains no API credentials.

Current acceptance status: the same app has been created and hardened in Google Build. Three final live Gemini scenarios passed, and reopening with the saved Flash-Lite default also completed a real run. Earlier HTML and timeout failures are retained in the acceptance record. The original prompt below describes the initial request; later hardening, runtime evidence and final limitations are documented separately. No billing activation, recharge, GitHub push or Publish action was performed.

```text
Create a brand-new English web app named OpsCrew for the AI Builder Cup 2026, theme Future of Work & Enterprise Productivity. Start from blank code; do not import or remix any previous project.

Build only a minimal expense-exception intake prototype using a React frontend and a Node.js backend. Provide a form with expense description, amount in USD, receipt status (available, missing, unknown), and optional employee identifier. Use synthetic data only and label it clearly.

On Analyze, call the Gemini API from the server with the official @google/genai SDK and the platform-provided GEMINI_API_KEY secret. Never put a private key in client code, a prompt, logs, or committed files. Use a currently free-tier Gemini model; prefer gemini-3.8-flash if available, make the model ID configurable, and do not automatically switch to paid models or enable billing.

Return strictly validated structured facts: amount_minor as an integer, currency USD, receipt_status, description, employee_identifier, missing_information, and contradictions. Unknown facts must remain null or unknown. Preserve inconsistencies between form fields and narrative instead of silently choosing. Show the actual model ID, a server-generated run ID, token usage if returned, clear loading/error states, and a readable JSON result. Do not fabricate model responses or success, and do not fall back to mock results after an API failure.

Create a polished, accessible English interface with an input panel and results panel, calm navy/teal colors, keyboard-friendly labels, and an explicit 'Prototype: no reimbursement approval or payment' notice. No database, approval workflow, email, external actions, paid cloud resources, image generation, or deployment yet. Include an English README describing this limited scope, server-side key setup, and later Cloud Run deployment. Keep the first version small and runnable in AI Studio preview.
```

Expected initial checks: two different synthetic inputs produce validated, non-fixed model results; missing facts stay unknown; a failed API call displays failure; private credentials are never in the browser or ordinary prompts. Cloud Run/Firebase deployment and the full competition submission remain later requirements.

Final outcome: the same app was created and hardened in Google Build; three real Gemini acceptance scenarios passed. See `aistudio-acceptance-2026-10-07.md` and `runtime-evidence-2026-10-07.json` for current status. Runtime GEMINI_MODEL is configured as gemini-3.1-flash-lite; no existing local app source was imported.
