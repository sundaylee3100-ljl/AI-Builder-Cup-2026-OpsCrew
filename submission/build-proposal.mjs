// One maintained proposal builder. The application runtime does not depend on this tooling.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtime = process.env.OPSCREW_DOCUMENT_RUNTIME || "C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies";
const skill = process.env.OPSCREW_PRESENTATIONS_SKILL || "C:/Users/admin/.codex/plugins/cache/openai-primary-runtime/presentations/26.1011.11113/skills/presentations";
process.env.RUNTIME_NODE_MODULES = path.join(runtime, "node/node_modules");
const { FileBlob, PresentationFile } = await import(pathToFileURL(path.join(runtime, "node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs")).href);
const source = path.join(repository, "submission/assets/official-submission-template.pptx");
const reportPath = process.argv[2];
const revision = process.argv[3] || "review";
const cloudCorePath = process.argv[4];
const cloudSafetyPath = process.argv[5];
if (!reportPath || !cloudCorePath || !cloudSafetyPath || !/^[a-zA-Z0-9-]+$/.test(revision)) throw new Error("Usage: node submission/build-proposal.mjs METRICS_JSON NEW_REVIEW_REVISION CLOUD_G3_JSON CLOUD_SAFETY_JSON");
const metrics = JSON.parse(await fs.readFile(path.resolve(repository, reportPath), "utf8"));
const offline = metrics.fresh_executed_checks?.offline_tests;
const offlineCount = offline ? `${offline.passed} / ${offline.passed + offline.failed}` : metrics.offline_tests;
if (!offlineCount) throw new Error("Missing recorded offline test result.");
const offlineDate = metrics.completed_at?.slice(0, 10) || "2026-10-11";
const core = JSON.parse(await fs.readFile(path.resolve(repository, cloudCorePath), "utf8"));
const safety = JSON.parse(await fs.readFile(path.resolve(repository, cloudSafetyPath), "utf8"));
if (!core.ok || !safety.ok || !safety.target?.startsWith("https://") || safety.deployment_source_image_binding !== "UNVERIFIED") throw new Error("This review builder requires successful recorded API evidence with its unverified deployment binding preserved.");
const cloudUrl = new URL(safety.target).href.replace(/\/$/, "");
const captain = process.env.OPSCREW_PUBLIC_CAPTAIN_NAME?.trim() || "awaiting verified registration name";
const videoUrl = process.env.OPSCREW_PUBLIC_VIDEO_URL?.trim();
if (videoUrl && !/^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com|drive\.google\.com)\//.test(videoUrl)) throw new Error("Use an allowed HTTPS public video host; anonymous playback still requires manual verification.");
const privateDirectory = path.join(repository, ".materials-build", revision);
const pptx = path.join(repository, `submission/OpsCrew_Proposal_Cloud_${revision}.pptx`);
const pdf = path.join(repository, `submission/OpsCrew_Proposal_Cloud_${revision}.pdf`);
await fs.mkdir(privateDirectory, { recursive: true });
for (const output of [pptx, pdf]) {
  try { await fs.access(output); throw new Error("Refusing to overwrite an existing material revision."); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const presentation = await PresentationFile.importPptx(await FileBlob.load(source));
const referenceFrames = presentation.slides.items;

// 01. Preserve the official cover and section header artwork. Download instructions,
// the unused blank page and the decorative closing page are not proposal content.
for (const [index, slide] of referenceFrames.entries()) {
  const blob = await presentation.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(path.join(privateDirectory, `reference-${index + 1}.png`), new Uint8Array(await blob.arrayBuffer()));
}
presentation.slides.keep([0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
const inspected = await presentation.inspect({ kind: "shape,textbox", limit: 150 });
const records = inspected.records || inspected.ndjson.split("\n").filter(Boolean).map(JSON.parse);
for (const record of records) {
  const shape = presentation.resolve(record.id);
  if (record.kind === "textbox") presentation.delete(record.id);
  else if (record.position?.top > 530) shape.position = { left: 0, top: 532, width: 960, height: 8 };
}
const font = "Google Sans Flex Medium";
function text(slide, content, x, y, width, height, size = 22, bold = false, color = "#17212B") {
  const s = slide.shapes.add({ geometry: "textbox", name: content.slice(0, 50), position: { left: x, top: y, width, height }, fill: "none", line: { fill: "none", width: 0 } });
  s.text = content;
  s.text.insets = 0;
  s.text.style = { fontSize: size, typeface: font, color, bold, verticalAlignment: "top" };
  return s;
}
function title(index, heading, sources) {
  const s = presentation.slides.items[index];
  text(s, heading, 28, 70, 904, 43, 25, true);
  text(s, `OpsCrew  /  Cloud evidence review  /  ${index + 1}`, 28, 505, 900, 20, 12, false, "#59636E");
  s.speakerNotes.text = sources.join("\n");
  return s;
}
function paragraphs(slide, values, start = 140, gap = 81, width = 888, size = 22) {
  values.forEach((value, index) => text(slide, value, 36, start + index * gap, width, gap - 10, size));
}
function node(slide, label, x, y, width = 265, height = 80) {
  const box = slide.shapes.add({ geometry: "rect", name: label, position: { left: x, top: y, width, height }, fill: "#F1F6F8", line: { fill: "#B8CCD3", width: 1 } });
  box.text = label; box.text.insets = 12;
  box.text.style = { fontSize: 21, typeface: font, color: "#173B4C", alignment: "center", verticalAlignment: "middle" };
  return box;
}
function arrow(slide, x, y, width = 27, height = 22, direction = "rightArrow") {
  slide.shapes.add({ geometry: direction, position: { left: x, top: y, width, height }, fill: "#567481", line: { fill: "none", width: 0 } });
}
function connect(slide, from, to, fromSide, toSide, kind = "elbow") {
  return slide.shapes.connect(from, to, { kind, fromSide, toSide, line: { style: "solid", fill: "#567481", width: 2 }, tail: { type: "triangle", width: "med", length: "med" } });
}
function table(slide, values, widths, y = 140, height = 290) {
  const t = slide.tables.add({ rows: values.length, columns: values[0].length, left: 36, top: y, width: widths.reduce((a, b) => a + b, 0), height, columnWidths: widths, values });
  t.borders.assign({ style: "solid", fill: "#D3DDE2", width: 1 });
  for (let r = 0; r < values.length; r++) for (let c = 0; c < values[0].length; c++) {
    const cell = t.getCell(r, c); cell.fill = r === 0 ? "#EDF3F6" : "#FFFFFF";
    cell.text.style = { fontSize: 19, typeface: font, bold: r === 0, color: "#17212B" };
  }
  return t;
}
const git = "https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew";
const rules = "https://aibuildercup.com/themes.html";
const s3 = "docs/acceptance/S03-confirmation-and-cases.md";

// 02. Write an English narrative with explicit evidence boundaries.
let slide = presentation.slides.items[0];
text(slide, "Team OpsCrew", 28, 303, 744, 42, 32, true);
text(slide, "Expense exception plans with human confirmation", 28, 355, 735, 61, 24);
text(slide, `Captain: ${captain}\nTheme: Future of Work & Enterprise Productivity`, 28, 428, 755, 65, 19);
text(slide, "Cloud evidence review  /  14 October 2026", 28, 505, 750, 20, 12, false, "#59636E");
slide.images.add({ blob: new Uint8Array(await fs.readFile(path.join(repository, "submission/assets/team-logo.png"))), contentType: "image/png", alt: "Owner-provided Gemini-generated OpsCrew logo", fit: "contain", position: { left: 802, top: 365, width: 130, height: 129 } });
slide.speakerNotes.text = `Public captain name, when provided, comes from the owner. Eligibility and registration declarations remain the authorized team's responsibility.\n${rules}\nFresh Google AI Studio Build creation on 7 October. Logo supplied by owner as Gemini-generated. The owner reports that the teammate used Google Antigravity to assist Cloud deployment; this is tool attribution, not automated deployment-source attestation.`;

slide = title(1, "Brief about the idea", [rules, "SCOPE.md", "docs/POLICY_AND_CONTRACTS.md"]);
paragraphs(slide, [
  "OpsCrew helps operations staff turn a synthetic expense exception into a supported handling plan.",
  "Gemini extracts facts, proposes steps, then reviews the proposal in a separate call. Fixed policy checks constrain each stage.",
  "A person reviews the current plan and explicitly confirms a case. The app reads the saved record independently before showing success.",
  "The prototype covers one synthetic USD policy. It creates handling records and performs no reimbursement or payment.",
], 132, 86);

slide = title(2, "Opportunities and proposed value", ["SCOPE.md", "docs/POLICY_AND_CONTRACTS.md", "docs/EVALUATION_PROTOCOL.md"]);
paragraphs(slide, [
  "Problem: staff must reconcile intake text, missing receipts and policy thresholds before deciding what to request next.",
  "Proposed difference: OpsCrew binds the plan to supported facts and exact policy clauses, then stores the person's confirmation with that version.",
  "Design value: input edits invalidate old plans. Contradictions and unsupported citations block case creation.",
  "Expected impact: clearer exception triage and fewer unsupported actions. Actual staff time savings and customer adoption remain unmeasured.",
], 132, 87);

slide = title(3, "Features offered by the solution", [s3, "docs/PRECLOUD_BACKEND.md"]);
paragraphs(slide, [
  "Synthetic presets and original text citations make intake decisions inspectable.",
  "Facts, Planner and Reviewer outputs expose disagreements and exact policy evidence.",
  "Firebase visitor identity, owned history and version-bound confirmation protect each person's handling records.",
  "Atomic writes, idempotent recovery and independent readback prevent duplicate or unverified success. Shared quotas bound model traffic.",
], 138, 84);

slide = title(4, "Process flow and confirmation", ["src/domain/workflow.ts", "docs/S3_CONFIRMATION_CASES.md", "docs/PRECLOUD_BACKEND.md"]);
node(slide, "Synthetic intake", 36, 145); node(slide, "Gemini facts", 346, 145); const flowReview = node(slide, "Planner + Reviewer", 656, 145);
arrow(slide, 308, 174); arrow(slide, 618, 174);
node(slide, "Saved record readback", 36, 293); node(slide, "Human confirmation", 346, 293); const flowPolicy = node(slide, "Fixed policy checks", 656, 293);
connect(slide, flowReview, flowPolicy, "bottom", "top", "straight");
arrow(slide, 308, 322, 27, 22, "leftArrow"); arrow(slide, 618, 322, 27, 22, "leftArrow");
text(slide, "Missing evidence produces a request plan. Contradictions block progression.\nEditing intake requires a new analysis and a new confirmation.", 36, 416, 885, 69, 21);

slide = title(5, "Interface and narrow-screen review", [s3, "docs/acceptance/S03-emulator-ui-mobile-2026-10-10.png"]);
slide.images.add({ blob: new Uint8Array(await fs.readFile(path.join(repository, "docs/acceptance/S03-emulator-ui-mobile-2026-10-10.png"))), contentType: "image/png", alt: "Actual S3 local emulator narrow-screen UI", fit: "contain", position: { left: 36, top: 125, width: 215, height: 370 } });
text(slide, "Observed local browser behavior", 286, 147, 635, 43, 23, true);
paragraphs(slide, [], 0);
text(slide, "Explicit confirmation remains separate from the AI review.\n\nSaved history survives a page reload with the same visitor identity.\n\nThe 390 px viewport had no horizontal overflow. Keyboard focus was visible.", 286, 208, 625, 218, 22);
text(slide, "Historical screenshot: local emulators and injected model output, 10 October. The cloud API evidence on pages 10-11 is separate.", 286, 444, 625, 52, 17, false, "#59636E");

slide = title(6, "Cloud architecture and trust boundaries", [cloudCorePath, cloudSafetyPath, "docs/PRECLOUD_DEPLOYMENT.md", "aistudio-export-2026-10-07/server/firebase-runtime.ts"]);
const browser = node(slide, "Browser\nEnglish React interface", 36, 145); const api = node(slide, "Cloud Run\nNode API + validators", 346, 145); node(slide, "Gemini API\nFacts / plan / review", 656, 145);
arrow(slide, 308, 174); arrow(slide, 618, 174);
const auth = node(slide, "Firebase Auth\nVisitor identity", 36, 304); const store = node(slide, "Firestore\nPlans / cases / quotas", 346, 304); const secret = node(slide, "Secret Manager\nServer credential only", 656, 304);
connect(slide, api, store, "bottom", "top", "straight");
connect(slide, browser, auth, "bottom", "top", "straight");
connect(slide, api, auth, "left", "right");
connect(slide, secret, api, "left", "right");
text(slide, "Recorded cloud APIs verify owner access, confirmation and saved-case readback. Direct visitor Firestore access is denied. Source-to-image identity and complete resource controls await verification.", 36, 426, 885, 72, 20);

slide = title(7, "Technologies used in the solution", ["PROVENANCE.md", "aistudio-export-2026-10-07/package-lock.json", "docs/PRECLOUD_DEPLOYMENT.md"]);
table(slide, [
  ["Component", "Role"],
  ["Google AI Studio Build", "Fresh application origin on 7 October"],
  ["Gemini 3.1 Flash-Lite", "Facts, separately prompted Planner and Reviewer"],
  ["Node 24 / React / TypeScript", "API, explicit review interface and fixed validators"],
  ["Firebase Auth + Firestore", "Visitor ownership, atomic records and shared quotas"],
  ["Cloud Run + Secret Manager", "Cloud API runtime and server-only credential"],
], [320, 568], 138, 313);
text(slide, "Created from zero in AI Studio Build. The teammate used Antigravity to assist Cloud deployment (owner-reported).", 36, 460, 888, 40, 18, false, "#59636E");

slide = title(8, "Implementation cost and traffic controls", ["docs/DELIVERY_WORKBOARD.md", "docs/PRECLOUD_BACKEND.md", "docs/EVALUATION_PROTOCOL.md"]);
paragraphs(slide, [
  "Team management target: USD 40. Billing alerts and application quotas cannot guarantee a monetary spending cap.",
  "Default model limits: 2 concurrent runs globally, 1 per visitor. Each visitor has 2 runs per minute and 12 per UTC day.",
  "Global limits: 6 runs per minute and 60 per UTC day. Each workflow reserves up to 6 provider attempts. Unknown usage receives no refund.",
  `13 October observations: ${safety.known_provider_attempts} provider attempts and ${safety.known_tokens.toLocaleString("en-US")} known tokens. One first FACTS call returned 503. Its usage and actual billed cost are unknown.`,
], 130, 88, 888, 21);

slide = title(9, "Prototype: recorded cloud API results", [cloudCorePath, cloudSafetyPath]);
table(slide, [
  ["Synthetic input / check", "Observed cloud result"],
  ["USD 38, missing receipt", "EVIDENCE_REQUEST plan. Explicit confirmation saved one case; independent readback matched."],
  ["DEV-01, receipt available", "NO_ACTION_REQUIRED. No exception case."],
  ["DEV-10, USD 38 form / USD 50 text", "BLOCKED. Conflicting sources prevent case creation."],
  ["Replay / different visitor", "Same committed case / 404 for the other visitor."],
], [330, 558], 138, 305);
text(slide, "Recorded HTTP response evidence, 13 October 2026. Synthetic handling records only. No reimbursement approval or payment occurs.", 36, 462, 888, 39, 18, false, "#59636E");

slide = title(10, "Performance report and evidence boundaries", [reportPath, cloudCorePath, cloudSafetyPath, "docs/PRECLOUD_EVALUATION.md"]);
table(slide, [
  ["Evidence", "Result", "Method"],
  ["Cloud core API", `${core.passed} / ${core.passed + core.failed}`, "Real Auth, Gemini, Firestore; 13 Oct"],
  ["Cloud safety API", `${safety.checks.filter(x => x.outcome === "PASS").length} / ${safety.checks.length}`, "Includes core verifier; overlapping checks"],
  ["Real Gemini workflows", "3 public cases", "Missing receipt, no action, contradiction"],
  ["Offline engineering", offlineCount, `${offlineDate} local regressions`],
  ["Historical packaging", "12 groups", "Includes 9 HTTP checks; native runtime, 11 Oct"],
], [265, 158, 465], 138, 302);
text(slide, "Three cloud workflow observations: 8.381-12.042 s. The missing-receipt run recovered from one 503. These public cases establish neither an SLA nor independent held-out acceptance.", 36, 456, 888, 47, 17, false, "#59636E");

slide = title(11, "Additional details and future development", ["docs/CLOUD_TEAMMATE_HANDOFF.md", "docs/EVALUATION_PROTOCOL.md", "SUBMISSION_CHECKLIST.md"]);
paragraphs(slide, [
  "Observed cloud APIs complete plan, explicit confirmation and independent record readback. Source-to-image identity and full operational controls still require verification.",
  "The teammate seals eight independent cases before first evaluation. Retain every attempt and run the main demo successfully three times in sequence.",
  "Record a genuine browser flow on the accepted release. Verify the final sub-three-minute English video through signed-out playback, and complete the team's registration declarations.",
  "After evaluation, consider broader policies and staff timing studies. Production reimbursement integrations require a separate design and authorization.",
], 132, 87, 888, 21);

slide = title(12, "Repository, demo and final product links", [git, "SUBMISSION_CHECKLIST.md", "submission/RECORDING_PLAN.md"]);
const link = text(slide, "Public GitHub repository", 36, 136, 888, 37, 24, true, "#086A86");
link.text.get("Public GitHub repository").link = { uri: git, isExternal: true };
text(slide, git.replace("https://", ""), 36, 177, 888, 42, 18, false, "#59636E");
const productLink = text(slide, "Cloud product URL", 36, 234, 888, 33, 23, true, "#086A86");
productLink.text.get("Cloud product URL").link = { uri: cloudUrl, isExternal: true };
text(slide, cloudUrl, 36, 274, 888, 42, 18, false, "#59636E");
const videoText = videoUrl ? "Public demo video (footage acceptance pending)" : "Public demo video: awaiting publication and verification";
const videoLink = text(slide, videoText, 36, 337, 888, 38, 23, Boolean(videoUrl), videoUrl ? "#086A86" : "#17212B");
if (videoUrl) videoLink.text.get(videoText).link = { uri: videoUrl, isExternal: true };
if (videoUrl) text(slide, videoUrl, 36, 378, 888, 36, 18, false, "#59636E");
text(slide, videoUrl ? "Review version. Public links supplied. Final footage acceptance and accepted release identity remain pending. Recorded product API tests are dated 13 October." : "Review version. Final submission requires the verified team name, public video playback and accepted release identity. The recorded product API tests are dated 13 October.", 36, 443, 888, 54, 19);

// 03. Validate the editable PPTX, export the same deck as PDF, then render all pages.
const candidate = path.join(privateDirectory, `candidate-${revision}.pptx`);
await (await PresentationFile.exportPptx(presentation)).save(candidate);
const { finalizePresentation } = await import(pathToFileURL(path.join(skill, "container_tools/artifact_tool_utils.mjs")).href);
await finalizePresentation({
  workspaceDir: repository, candidatePath: candidate, finalPath: pptx,
  pythonExecutable: path.join(runtime, "python/python.exe"),
  integrityValidatorPath: path.join(skill, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skill, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "9144000,5143500", "--validate-bullet-geometry", "--validate-heading-fit", "--require-native-table-slide", "8", "--require-native-table-slide", "11"],
  requiredNativeTableOwnerSlides: [8, 11],
  fontPolicy: { basis: "reference", families: [font, "Google Sans Flex SemiBold"], referencePath: source, referenceSha256: createHash("sha256").update(await fs.readFile(source)).digest("hex") },
  verifyArtifactToolImport: true,
  receiptPath: path.join(privateDirectory, `proposal-${revision}.validation.json`),
});
const finalDeck = await PresentationFile.importPptx(await FileBlob.load(pptx));
for (const [index, page] of finalDeck.slides.items.entries()) {
  const png = await finalDeck.export({ slide: page, format: "png", scale: 2 });
  await fs.writeFile(path.join(privateDirectory, `proposal-${revision}-${index + 1}.png`), new Uint8Array(await png.arrayBuffer()));
}
// Artifact Tool 2.8.89 cannot replay a template image's Canvas roundRect in its
// vector PDF exporter. Build the identical visual pages from its final-PPTX
// renders at 192 dpi, with a real public link annotation. PPTX stays editable.
const pdfSource = `
import sys, pathlib
from reportlab.pdfgen import canvas
from pypdf import PdfReader
out, directory, revision, count, url = sys.argv[1:6]
count = int(count)
doc = canvas.Canvas(out, pagesize=(720,405), pageCompression=1)
doc.setTitle('OpsCrew: Expense Exception Plan and Review (Cloud evidence review)')
doc.setAuthor('Team OpsCrew')
for number in range(1,count+1):
    doc.drawImage(str(pathlib.Path(directory) / ('proposal-' + revision + '-' + str(number) + '.png')),0,0,720,405)
    if number == count:
        doc.linkURL(url,(27,240.75,693,303),relative=0,thickness=0)
        doc.linkURL(sys.argv[6],(27,168,693,229.5),relative=0,thickness=0)
        if sys.argv[7]: doc.linkURL(sys.argv[7],(27,93,693,152.25),relative=0,thickness=0)
    doc.showPage()
doc.save()
reader = PdfReader(out)
assert len(reader.pages) == count
assert any(annotation.get_object().get('/A',{}).get('/URI') == url for annotation in reader.pages[-1].get('/Annots',[]))
print('PDF page count and actual GitHub link passed')
`;
const pdfCheck = execFileSync(path.join(runtime, "python/python.exe"), ["-B", "-c", pdfSource, pdf, privateDirectory, revision, String(finalDeck.slides.items.length), git, cloudUrl, videoUrl || ""], { encoding: "utf8", windowsHide: true });
console.log(pdfCheck.trim());
console.log(JSON.stringify({ pptx, pdf, slides: finalDeck.slides.items.length, pdfFormat: "192-dpi rendered slide pages with clickable GitHub annotation", manualVisualInspectionRequired: true }));
