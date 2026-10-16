// One maintained proposal builder. The application runtime does not depend on this tooling.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtime = process.env.OPSCREW_DOCUMENT_RUNTIME || "C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies";
const skill = process.env.OPSCREW_PRESENTATIONS_SKILL || "C:/Users/admin/.codex/plugins/cache/openai-primary-runtime/presentations/26.1013.11914/skills/presentations";
process.env.RUNTIME_NODE_MODULES = path.join(runtime, "node/node_modules");
const { FileBlob, PresentationFile } = await import(pathToFileURL(path.join(runtime, "node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs")).href);
const source = path.join(repository, "submission/assets/official-submission-template.pptx");
const requestedReportPath = process.argv[2];
const revision = process.argv[3] || "review";
const cloudCorePath = process.argv[4];
const cloudSafetyPath = process.argv[5];
if (!requestedReportPath || !cloudCorePath || !cloudSafetyPath || !/^[a-zA-Z0-9-]+$/.test(revision)) throw new Error("Usage: node submission/build-proposal.mjs METRICS_JSON NEW_REVIEW_REVISION CLOUD_G3_JSON CLOUD_SAFETY_JSON");
// Prefer the integrated provider review when available. An older CLI evidence path
// remains a fallback, but its observations retain their original dates and scope.
let reportPath = requestedReportPath;
let metrics;
const integratedReportPath = "docs/acceptance/FINAL-integrated-validation-2026-10-16.json";
try {
  metrics = JSON.parse(await fs.readFile(path.resolve(repository, integratedReportPath), "utf8"));
  if (!metrics.metrics?.offline_tests) throw new Error("Integrated evidence has no recorded offline result.");
  reportPath = integratedReportPath;
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  metrics = JSON.parse(await fs.readFile(path.resolve(repository, reportPath), "utf8"));
}
const offline = metrics.metrics?.offline_tests || metrics.fresh_executed_checks?.offline_tests || (typeof metrics.offline_tests === "object" ? metrics.offline_tests : null);
const offlineCount = offline ? `${offline.passed} / ${offline.passed + offline.failed}` : metrics.offline_tests;
if (!offlineCount) throw new Error("Missing recorded offline test result.");
const offlineDate = metrics.completed_at?.slice(0, 10) || metrics.audit_date;
if (!/^\d{4}-\d{2}-\d{2}$/.test(offlineDate || "")) throw new Error("The offline evidence must supply its actual execution/audit date.");
const nativeArtifact = metrics.metrics?.native_production_artifact || metrics.native_production_artifact || metrics.fresh_executed_checks?.native_production_artifact;
const nativeArtifactCount = Number.isInteger(nativeArtifact?.passed_groups) && nativeArtifact.status !== "PENDING" ? `${nativeArtifact.passed_groups} groups` : "Pending";
const nativeArtifactMethod = nativeArtifactCount === "Pending" ? "No completed result for current source" : `${Number.isInteger(nativeArtifact.http_checks_included) ? `${nativeArtifact.http_checks_included} HTTP checks included, ` : "Native runtime, "}${offlineDate}`;
const core = JSON.parse(await fs.readFile(path.resolve(repository, cloudCorePath), "utf8"));
const safety = JSON.parse(await fs.readFile(path.resolve(repository, cloudSafetyPath), "utf8"));
if (!core.ok || !safety.ok || !safety.target?.startsWith("https://") || safety.deployment_source_image_binding !== "UNVERIFIED") throw new Error("This review builder requires successful recorded API evidence with its unverified deployment binding preserved.");
const cloudUrl = new URL(safety.target).href.replace(/\/$/, "");
const captain = process.env.OPSCREW_PUBLIC_CAPTAIN_NAME?.trim() || "awaiting verified registration name";
const videoUrl = process.env.OPSCREW_PUBLIC_VIDEO_URL?.trim();
if (videoUrl && !/^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com|drive\.google\.com)\//.test(videoUrl)) throw new Error("Use an allowed HTTPS public video host; anonymous playback still requires manual verification.");
const videoAccepted = process.env.OPSCREW_VIDEO_CONTENT_ACCEPTED === "true";
if (videoAccepted && !videoUrl) throw new Error("Accepted footage still requires an anonymously playable public video URL.");
const publicVideoAccepted = videoAccepted && process.env.OPSCREW_VIDEO_ANONYMOUS_PLAYBACK_ACCEPTED === "true";
const proposalLabel = videoAccepted ? "Competition proposal" : "Submission review";
const screenshotPath = process.env.OPSCREW_CLOUD_SCREENSHOT?.trim();
const screenshotSeconds = process.env.OPSCREW_CLOUD_SCREENSHOT_SECONDS?.trim();
if (screenshotPath && !/^\d+(?:\.\d+)?$/.test(screenshotSeconds || "")) throw new Error("Cloud footage screenshots require their actual source timestamp in seconds.");
const savedScreenshotPath = process.env.OPSCREW_CLOUD_SAVEDCASE_SCREENSHOT?.trim();
const savedScreenshotSeconds = process.env.OPSCREW_CLOUD_SAVEDCASE_SCREENSHOT_SECONDS?.trim();
if (savedScreenshotPath && !/^\d+(?:\.\d+)?$/.test(savedScreenshotSeconds || "")) throw new Error("Saved-case screenshots require their actual source timestamp in seconds.");
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
  text(s, `OpsCrew  /  ${proposalLabel}  /  ${index + 1}`, 28, 505, 900, 20, 12, false, "#59636E");
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
text(slide, `${proposalLabel}  /  16 October 2026`, 28, 505, 750, 20, 12, false, "#59636E");
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

slide = title(5, screenshotPath ? "Interface in the recorded cloud demonstration" : "Interface and narrow-screen review", [s3, screenshotPath || "docs/acceptance/S03-emulator-ui-mobile-2026-10-10.png"]);
if (screenshotPath) {
  slide.images.add({ blob: new Uint8Array(await fs.readFile(path.resolve(repository, screenshotPath))), contentType: "image/png", alt: `Actual cloud interface in the supplied recording at ${screenshotSeconds} seconds`, fit: "contain", position: { left: 36, top: 125, width: 640, height: 360 } });
  text(slide, "A person reviews the current result before confirming an eligible handling record.", 702, 145, 220, 147, 21);
  text(slide, `Recorded UI, 15 October 2026, at ${screenshotSeconds} s. Synthetic example supplied by the team.`, 702, 324, 220, 169, 17, false, "#59636E");
} else {
  slide.images.add({ blob: new Uint8Array(await fs.readFile(path.join(repository, "docs/acceptance/S03-emulator-ui-mobile-2026-10-10.png"))), contentType: "image/png", alt: "Actual S3 local emulator narrow-screen UI", fit: "contain", position: { left: 36, top: 125, width: 215, height: 370 } });
  text(slide, "Observed local browser behavior", 286, 147, 635, 43, 23, true);
  text(slide, "Explicit confirmation remains separate from the AI review.\n\nSaved history survives a page reload with the same visitor identity.\n\nThe 390 px viewport had no horizontal overflow. Keyboard focus was visible.", 286, 208, 625, 218, 22);
  text(slide, "Historical screenshot: local emulators and injected model output, 10 October. The cloud API evidence on pages 10-11 is separate.", 286, 444, 625, 52, 17, false, "#59636E");
}

slide = title(6, "Cloud architecture and trust boundaries", [reportPath, "docs/acceptance/FINAL-cloud-readonly-2026-10-16.json", "aistudio-export-2026-10-07/server/runtime-config.ts", "aistudio-export-2026-10-07/server/planning-service.ts"]);
const browser = node(slide, "Browser\nEnglish React interface", 36, 145); const api = node(slide, "Cloud Run\nNode API + validators", 346, 145); node(slide, "Vertex AI / Gemini\nDeveloper API option", 656, 145);
arrow(slide, 308, 174); arrow(slide, 618, 174);
const auth = node(slide, "Firebase Auth\nVisitor identity", 36, 304); const store = node(slide, "Firestore\nPlans / cases / quotas", 346, 304); const credential = node(slide, "ADC service identity\nAPI key optional", 656, 304);
connect(slide, api, store, "bottom", "top", "straight");
connect(slide, browser, auth, "bottom", "top", "straight");
connect(slide, api, auth, "left", "right");
connect(slide, credential, api, "left", "right");
text(slide, "The server selects Vertex AI with ADC or the optional Developer API route. Model credentials stay on the server. Visitor identity controls access to plans and saved cases.", 36, 426, 885, 72, 20);

slide = title(7, "Technologies used in the solution", ["PROVENANCE.md", reportPath, "docs/acceptance/FINAL-cloud-readonly-2026-10-16.json", "aistudio-export-2026-10-07/server/runtime-config.ts"]);
table(slide, [
  ["Component", "Role"],
  ["Google AI Studio Build", "Fresh application origin on 7 October"],
  ["Gemini server modes", "Vertex AI with ADC; optional Developer API"],
  ["Current service config", "Gemini 2.5 Flash, self-reported on 16 October"],
  ["Node 24 / React / TypeScript", "Explicit confirmation and fixed API policy checks"],
  ["Cloud Run + Firebase", "Hosting, visitor identity and saved handling records"],
], [320, 568], 138, 313);
text(slide, "From zero in AI Studio Build. Antigravity assisted deployment (team-reported).", 36, 460, 888, 40, 18, false, "#59636E");

slide = title(8, "Implementation cost and traffic controls", ["docs/DELIVERY_WORKBOARD.md", "docs/PRECLOUD_BACKEND.md", "docs/EVALUATION_PROTOCOL.md"]);
paragraphs(slide, [
  "Team management target: USD 40. Billing alerts and application quotas cannot guarantee a monetary spending cap.",
  "Default model limits: 2 concurrent runs globally, 1 per visitor. Each visitor has 2 runs per minute and 12 per UTC day.",
  "Global limits: 6 runs per minute and 60 per UTC day. Each workflow reserves up to 6 provider attempts. Unknown usage receives no refund.",
  `Historical 13 October Developer API observations: ${safety.known_provider_attempts} attempts and ${safety.known_tokens.toLocaleString("en-US")} known tokens. One FACTS call returned 503. Its usage and actual billed cost are unknown.`,
], 130, 88, 888, 21);

slide = title(9, savedScreenshotPath ? "Prototype: confirmed case and independent readback" : "Prototype: recorded cloud API results", [cloudCorePath, cloudSafetyPath, ...(savedScreenshotPath ? [savedScreenshotPath] : [])]);
if (savedScreenshotPath) {
  slide.images.add({ blob: new Uint8Array(await fs.readFile(path.resolve(repository, savedScreenshotPath))), contentType: "image/png", alt: `Actual saved-case interface in the supplied recording at ${savedScreenshotSeconds} seconds`, fit: "contain", position: { left: 36, top: 140, width: 888, height: 299 } });
  text(slide, `Recorded UI, 15 October 2026, at ${savedScreenshotSeconds} s. The confirmed USD 38 synthetic request is OPEN. No reimbursement approval or payment occurs.`, 36, 454, 888, 49, 18, false, "#59636E");
} else {
table(slide, [
  ["Synthetic input / check", "Observed cloud result"],
  ["USD 38, missing receipt", "EVIDENCE_REQUEST plan. Explicit confirmation saved one case; independent readback matched."],
  ["DEV-01, receipt available", "NO_ACTION_REQUIRED. No exception case."],
  ["DEV-10, USD 38 form / USD 50 text", "BLOCKED. Conflicting sources prevent case creation."],
  ["Replay / different visitor", "Same committed case / 404 for the other visitor."],
], [330, 558], 138, 305);
text(slide, "Recorded HTTP response evidence, 13 October 2026. Synthetic handling records only. No reimbursement approval or payment occurs.", 36, 462, 888, 39, 18, false, "#59636E");
}

slide = title(10, "Performance report and evidence boundaries", [reportPath, cloudCorePath, cloudSafetyPath, "docs/PRECLOUD_EVALUATION.md"]);
const performanceTable = table(slide, [
  ["Evidence", "Result", "Method"],
  ["Historical cloud core", `${core.passed} / ${core.passed + core.failed}`, "3.1 Flash-Lite Developer API, 13 Oct"],
  ["Historical cloud safety", `${safety.checks.filter(x => x.outcome === "PASS").length} / ${safety.checks.length}`, "13 Oct, includes overlapping core checks"],
  ["Historical real workflows", "3 public cases", "3.1 Flash-Lite, 13 Oct"],
  ["Offline engineering", offlineCount, `${offlineDate} local regressions`],
  ["Native artifact checks", nativeArtifactCount, nativeArtifactMethod],
], [265, 158, 465], 138, 302);
for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) performanceTable.getCell(r, c).text.style = { fontSize: 18, typeface: font, bold: r === 0, color: "#17212B" };
text(slide, "13 October workflow observations: 8.381-12.042 s, including recovery from one 503. These results do not certify the current Vertex backend, an SLA or independent held-out acceptance.", 36, 456, 888, 47, 17, false, "#59636E");

slide = title(11, "Additional details and future development", ["docs/CLOUD_TEAMMATE_HANDOFF.md", "docs/EVALUATION_PROTOCOL.md", "SUBMISSION_CHECKLIST.md"]);
paragraphs(slide, [
  "Extend deployment operations checks and provider regression coverage. The retained real-model API evidence is dated 13 October; current provider switching has separate offline tests.",
  "Current evidence uses public synthetic examples. Independent held-out evaluation and staff timing studies remain future validation work.",
  videoAccepted ? "The demonstration presents recorded interface operation with English narration, synthetic data and disclosed edits. A person reviews each eligible plan before creating its case." : "The replacement video uses recorded interface footage. Final publication and complete public playback require acceptance.",
  "After evaluation, consider broader policies and staff timing studies. Production reimbursement integrations require a separate design and authorization.",
], 132, 87, 888, 21);

slide = title(12, "Repository, demo and final product links", [git, "SUBMISSION_CHECKLIST.md", "submission/RECORDING_PLAN.md"]);
const link = text(slide, "Public GitHub repository", 36, 136, 888, 37, 24, true, "#086A86");
link.text.get("Public GitHub repository").link = { uri: git, isExternal: true };
text(slide, git.replace("https://", ""), 36, 177, 888, 42, 18, false, "#59636E");
const productLink = text(slide, "Cloud product URL", 36, 234, 888, 33, 23, true, "#086A86");
productLink.text.get("Cloud product URL").link = { uri: cloudUrl, isExternal: true };
text(slide, cloudUrl, 36, 274, 888, 42, 18, false, "#59636E");
const videoText = videoAccepted ? "Demo video" : videoUrl ? "Candidate video link (acceptance pending)" : "Public demo video: replacement upload pending";
const videoLink = text(slide, videoText, 36, 337, 888, 38, 23, Boolean(videoUrl), videoUrl ? "#086A86" : "#17212B");
if (videoUrl) videoLink.text.get(videoText).link = { uri: videoUrl, isExternal: true };
if (videoUrl) text(slide, videoUrl, 36, 378, 888, 36, 18, false, "#59636E");
text(slide, videoAccepted ? `Created in Google AI Studio Build on 7 October. Historical cloud API evidence: 13 October. Integrated offline checks: ${offlineDate}.` : "Submission review. Replacement public video and signed-out playback remain pending. Historical cloud API tests do not certify the current Vertex backend.", 36, 443, 888, 54, 19);

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
doc.setTitle('OpsCrew: Expense Exception Plan and Review | AI Builder Cup 2026')
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
console.log(JSON.stringify({ pptx, pdf, slides: finalDeck.slides.items.length, pdfFormat: "192-dpi rendered slide pages with clickable public link annotations", manualVisualInspectionRequired: true, acceptanceGenerationNotes: { engineeringReport: reportPath, offlineDate, offlineCount, nativeArtifactCount, currentProvider: "Reviewed Vertex AI ADC / optional Developer API source; Gemini 2.5 Flash is current public configuration self-report", historicalCloud: "13 October Gemini 3.1 Flash-Lite Developer API observations only", currentVertexLive: "NOT_EXECUTED_BY_REVIEWER", deploymentBinding: "Team-reported identifiers, no independent control-plane/source archive attestation", noADKorAgentEngineRuntimeClaim: true, publicVideoAccepted } }));
