# Google Build hardening prompt (submitted to the existing app)

Apply this only in the existing OpsCrew AI Studio app. Keep development in Google Build.

```text
Harden the existing working prototype without expanding scope. Preserve the real server-side @google/genai call, the current configured model, the working preview routes and the English UI. Do not deploy, enable billing, add integrations or fabricate results.

A read-only review of the exported checkpoint found these concrete defects in server.ts:
1. extractNarrativeDollarAmountsMinor parses "$8200.00" as 82000 cents instead of 820000 because the first regex alternative can match only the first three digits. Parse complete numeric tokens, with and without thousands separators. Both "$8200.00" and "$8,200.00" must produce 820000, without partial matches.
2. narrativeSaysMissing matches the word "missing" anywhere. "Missing employee ID. Dinner $148.50, receipt attached." must not create a receipt conflict. Bind lost/missing/illegible statements to receipt language; preserve genuine "receipt lost" and "no receipt" conflicts.
3. parseFormUsdToMinor and validateAndEnrichFacts must reject negative, non-finite or unsafe-integer minor units, and require every contract field. Do not silently accept undefined in place of required null fields.
4. Reject non-string members in missing_information or contradictions rather than filtering them into a successful validated result.
5. Ground employee_identifier in the supplied form or narrative. When neither supplies an identifier, enforce null; a model-proposed ID absent from both inputs must fail validation. Preserve explicit form/narrative conflicts and identify both sources; do not force every output to equal the form or invent a winner.
6. Add a bounded request timeout using supported SDK cancellation/timeout configuration and a bounded UI waiting state. Return explicit JSON timeout errors with run ID and HTTP/ upstream status. Keep retry count finite.
7. Cost wording must be accurate: use a server-side allowlist for the currently configured supported model, remove arbitrary custom model selection, and replace claims that the app guarantees free runtime/zero cloud cost. App code does not know the account billing tier. State that no billing activation or paid deployment is performed by this prototype.

Add focused offline tests for the concrete cases above, with no API keys, network or mocks presented as real runs. Run compilation and these tests. Keep all normal output in English. Report files changed and test results; do not start additional live API calls during the edit.
```
