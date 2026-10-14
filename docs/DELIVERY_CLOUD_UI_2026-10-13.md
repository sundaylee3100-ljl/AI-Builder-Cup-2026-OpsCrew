# OpsCrew cloud browser entry audit — 2026-10-13

**Result: PARTIAL — actual browser accessibility observation passed; pixel-based visual verification remains NOT RUN.**

Target: [public OpsCrew Cloud Run entry](https://opscrew-883881551915.us-central1.run.app/).

The application was observed in an actual native Comet window using the bundled computer-use/Sky accessibility API. This is rendered browser accessibility evidence, not an inspection of downloaded JavaScript or application source. No visitor session, model workflow, case confirmation or other business write was initiated by this reviewer.

## Observed initial state

| Check | Actual native accessibility observation |
| --- | --- |
| Correct application/URL | Window title “OpsCrew — Expense Exception Plan & Review - Comet”; RootWebArea URL is the target HTTPS Cloud Run URL. |
| Application mount | Full application document and interactive controls are exposed in the browser accessibility tree: intake, presets, model selection, policy/plan/review and human-confirmation sections. This establishes DOM/AX mount; it does not prove correct pixel paint or absence of a visually white page. |
| English application content | Title, navigation, synthetic-data notice, field labels, policy and confirmation guidance are English. Native browser chrome is Chinese and is outside application-language acceptance. |
| Synthetic presets | Six buttons: high amount; amount/receipt conflict; unknown receipt/null employee; employee mismatch; missing-receipt evidence request; complete/no exception. |
| Default intake | USD 245.50, available receipt, synthetic employee SYNTH-EMP-1042 and a synthetic replacement-display narrative. |
| Default model and limits | Gemini 3.1 Flash-Lite (Configured Default); 90-second run limit; up to 2 runs/minute and 12/visitor/UTC day; one active run per visitor. Failed/canceled runs may consume allowance. |
| Analysis guarded before identity | Native AX element 776 is explicitly **disabled**, labeled “Analyze, plan & review.” Page says to start a visitor session below. |
| No existing result | “Ready for a synthetic run” and “No Current Plan or Review.” No fabricated plan/review success is presented in this observed initial state. |
| Confirmation guarded before identity/plan | “Firebase sandbox,” “Visitor session required” and “Start visitor session” are exposed. No confirmation checkbox or case-submit action is exposed in this initial AX observation. They are gated/absent here; this review does not inaccurately call an unseen checkbox disabled. |
| Guardrails | Synthetic data only; no reimbursement approval/payment; separate human confirmation and independent saved-record read are stated. |

## Screenshot/tool boundary

The root task's in-app-browser binding had previously timed out once. This reviewer read the current computer-use skill and all required guidance/API/confirmation documents, initialized Sky, then observed these outcomes:

1. First lightweight `list_apps` request timed out.
2. After a two-second wait, its retry succeeded. Comet was returned without a targetable window, so the already installed Comet app was launched by its returned app ID; refreshed inventory returned one window.
3. `get_window_state(include_screenshot:false, include_text:true)` succeeded. Its cached native accessibility observation is the evidence summarized above.
4. `get_window_state(include_screenshot:true, include_text:true)` failed with **“FrameArrived timed out: timed out waiting on channel.”**

Counting the root binding timeout, the lightweight timeout and screenshot failure reaches the task's three-failure recovery ceiling. No further browser capture/input was attempted. Reading the already obtained accessibility snapshot did not initiate another window capture or an application action.

**No `DELIVERY-cloud-ui-2026-10-13.png` was generated.** No returned screenshot pixels were available to save. Desktop/mobile layout, visual clipping, browser console state and pixel-level absence of a blank page remain unverified; this helper failure is not evidence that the website is down. The root task's independent API/workflow acceptance is separate evidence and is not relabeled as visual acceptance here.

## Actions and custody

The reviewer made **0 signups, 0 workflows, 0 case writes, 0 clicks, 0 typed input and 0 tab navigations**. The native browser app was opened by its installed returned app ID solely to obtain a targetable window. Existing Comet tabs and the root's existing in-app-browser tab were not closed or changed. No new audit tab or temporary directory was created, and no original submission/video/PDF file was modified.

A future successful pixel capture should verify the actual cloud page, initial guards and responsive layout, without substituting an emulator/precloud screenshot. Starting a model workflow is unnecessary for that visual-only check.
