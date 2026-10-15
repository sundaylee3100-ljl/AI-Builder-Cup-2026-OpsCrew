import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const TARGET_URL = "https://opscrew-883881551915.us-central1.run.app";
const PROXY_SERVER = "http://127.0.0.1:7897";
const OUTPUT_DIR = path.resolve("submission/video_output");
const RAW_DIR = path.resolve("submission/video_output/raw");
const AUDIO_DIR = path.resolve("submission/video_output/audio");

// Ensure clean directories
if (fs.existsSync(RAW_DIR)) {
  fs.rmSync(RAW_DIR, { recursive: true, force: true });
}
fs.mkdirSync(RAW_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });

// Narration text definitions
const CLIPS_CONFIG = [
  {
    id: "c1",
    defaultDelayMs: 1000, // 00:01.00
    text: "We are OpsCrew. We built this expense exception prototype from zero in Google AI Studio Build. Gemini plans and reviews the handling steps. Our teammate used Antigravity to assist deployment."
  },
  {
    id: "c2",
    defaultDelayMs: 15000, // 00:15.00
    text: "I explicitly start a Firebase visitor session. This synthetic example is a thirty-eight-dollar parking expense for employee SYNTH-EMP-100, with a missing receipt."
  },
  {
    id: "c3a",
    defaultDelayMs: 35000, // 00:35.00
    text: "Gemini extracts facts, then a separately prompted Planner proposes handling steps. A Reviewer checks the proposal. This timer measures elapsed time."
  },
  {
    id: "c3b",
    defaultDelayMs: 70000, // 01:10.00
    text: "Completed role attempts appear after the response; it is not live progress inside each stage."
  },
  {
    id: "c4",
    defaultDelayMs: 95000, // 01:35.00
    text: "The current result requests receipt evidence. Clause SYN-004 asks for an itemized receipt or a written explanation. The passing plan and review grant no permission to create a case, reimburse or pay."
  },
  {
    id: "c5",
    defaultDelayMs: 128000, // 02:08.00
    text: "I prepare human confirmation, inspect this specific plan, and explicitly authorize the synthetic exception record. The checkbox starts unchecked. I now submit that authorization."
  },
  {
    id: "c6",
    defaultDelayMs: 148000, // 02:28.00
    text: "Success appears only after a separate read of the saved record. I refresh this visitor's history and reopen the same case. OpsCrew does not approve reimbursement, issue payment or send a message automatically."
  }
];

// Synthesize audio clips upfront
function prepareClips(audioDir) {
  console.log("=== Synthesizing Individual Narration Audio Clips (Samantha -r 170) ===");
  const clipDurations = {};
  for (let i = 0; i < CLIPS_CONFIG.length; i++) {
    const c = CLIPS_CONFIG[i];
    const aiffPath = path.join(audioDir, `${c.id}.aiff`);
    const wavPath = path.join(audioDir, `${c.id}.wav`);
    console.log(`[TTS] Synthesizing clip ${i + 1}/${CLIPS_CONFIG.length} (${c.id})...`);
    execSync(`say -v Samantha -r 170 "${c.text.replace(/"/g, '\\"')}" -o "${aiffPath}"`);
    execSync(`ffmpeg -y -i "${aiffPath}" -ar 48000 -ac 2 "${wavPath}"`, { stdio: "ignore" });
    const durStr = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${wavPath}"`).toString().trim();
    clipDurations[c.id] = parseFloat(durStr);
    console.log(`[TTS] ${c.id}: ${clipDurations[c.id].toFixed(2)}s`);
  }
  return clipDurations;
}

// Assemble master audio track with exact dynamic timestamps
function buildMasterAudio(audioDir, eventDelaysMs, clipDurations, totalDurationSec = 165.0) {
  console.log("\n=== Assembling Master Audio Track with Measured Event Timestamps ===");
  const inputs = [];
  const filterParts = [];

  for (let i = 0; i < CLIPS_CONFIG.length; i++) {
    const c = CLIPS_CONFIG[i];
    const wavPath = path.join(audioDir, `${c.id}.wav`);
    const delay = eventDelaysMs[c.id] || c.defaultDelayMs;
    console.log(`[Audio Mix] Clip ${c.id}: delay ${delay}ms (${(delay / 1000).toFixed(2)}s), duration ${clipDurations[c.id].toFixed(2)}s`);
    inputs.push(`-i "${wavPath}"`);
    filterParts.push(`[${i}:a]adelay=${delay}|${delay}[a${i}]`);
  }

  const mixInputs = CLIPS_CONFIG.map((_, i) => `[a${i}]`).join("");
  const filterStr = `${filterParts.join(";")};${mixInputs}amix=inputs=${CLIPS_CONFIG.length}:dropout_transition=0:normalize=0,highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`;
  const masterAudio = path.join(audioDir, "master_audio.wav");

  console.log(`[Mastering] Normalizing loudness to EBU R128 (-16 LUFS), duration: ${totalDurationSec}s...`);
  execSync(
    `ffmpeg -y ${inputs.join(" ")} -filter_complex "${filterStr}" -map "[aout]" -t ${totalDurationSec.toFixed(2)} -ar 48000 -ac 2 "${masterAudio}"`,
    { stdio: "ignore" }
  );

  const dur = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${masterAudio}"`
  ).toString().trim();
  console.log(`[Mastering] Master audio track ready: ${dur}s\n`);
  return masterAudio;
}

function formatSrtTime(ms) {
  const h = Math.floor(ms / 3600000).toString().padStart(2, "0");
  const m = Math.floor((ms % 3600000) / 60000).toString().padStart(2, "0");
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, "0");
  const millis = (ms % 1000).toString().padStart(3, "0");
  return `${h}:${m}:${s},${millis}`;
}

function formatVttTime(ms) {
  return formatSrtTime(ms).replace(",", ".");
}

function generateSubtitles(eventDelaysMs, clipDurations) {
  let srt = "";
  let vtt = "WEBVTT\n\n";

  for (let i = 0; i < CLIPS_CONFIG.length; i++) {
    const c = CLIPS_CONFIG[i];
    const startMs = eventDelaysMs[c.id] || c.defaultDelayMs;
    const durMs = Math.round((clipDurations[c.id] + 0.8) * 1000);
    const endMs = startMs + durMs;

    srt += `${i + 1}\n${formatSrtTime(startMs)} --> ${formatSrtTime(endMs)}\n${c.text}\n\n`;
    vtt += `${formatVttTime(startMs)} --> ${formatVttTime(endMs)}\n${c.text}\n\n`;
  }

  const srtFile = path.join(OUTPUT_DIR, "OpsCrew_Cloud_Demo_165s.srt");
  const vttFile = path.join(OUTPUT_DIR, "OpsCrew_Cloud_Demo_165s.vtt");
  fs.writeFileSync(srtFile, srt.trim() + "\n", "utf8");
  fs.writeFileSync(vttFile, vtt.trim() + "\n", "utf8");
  return { srtFile, vttFile };
}

async function run() {
  console.log("===============================================================================");
  console.log("    OpsCrew Live Cloud Demo Recording (Zero-Blank, Synchronized Broadcast)     ");
  console.log("===============================================================================");
  console.log("Target Cloud URL:", TARGET_URL);
  console.log("Proxy Server:    ", PROXY_SERVER);

  const clipDurations = prepareClips(AUDIO_DIR);
  const eventDelaysMs = {};

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    proxy: { server: PROXY_SERVER },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-infobars"]
  });

  const rawRecordingStartTime = Date.now();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: RAW_DIR,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  page.on("console", msg => console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`));
  page.on("pageerror", err => console.log(`[BROWSER ERROR] ${err.message}`));
  page.on("response", res => {
    if (res.url().includes("/api/")) {
      console.log(`[HTTP ${res.status()}] ${res.url()}`);
    }
  });

  console.log("\n[Pre-roll] Loading deployed Cloud Run application over proxy...");
  await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("#expense-description", { timeout: 20000 });

  // Inject top browser chrome bar, mouse cursor, and subtitle banner
  await page.evaluate(() => {
    // 1. Sleek Top Bar showing real Cloud Run URL
    const bar = document.createElement("div");
    bar.id = "demo-browser-chrome";
    bar.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; height: 42px;
      background: #0f172a; border-bottom: 1px solid #334155;
      z-index: 9999999; display: flex; align-items: center; padding: 0 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25);
    `;
    bar.innerHTML = `
      <div style="display:flex; gap:6px; margin-right:16px;">
        <div style="width:12px; height:12px; border-radius:50%; background:#ef4444;"></div>
        <div style="width:12px; height:12px; border-radius:50%; background:#f59e0b;"></div>
        <div style="width:12px; height:12px; border-radius:50%; background:#10b981;"></div>
      </div>
      <div style="flex:1; max-width:680px; margin:0 auto; background:#1e293b; border-radius:6px; height:28px; display:flex; align-items:center; padding:0 12px; font-size:12px; font-family:ui-monospace, monospace; border:1px solid #475569;">
        <span style="color:#10b981; margin-right:8px; font-size:13px;">🔒</span>
        <span style="color:#f8fafc; font-weight:600;">https://opscrew-883881551915.us-central1.run.app</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981;"></span>
        <span style="color:#38bdf8; font-size:11px; font-weight:600; letter-spacing:0.5px;">CLOUD RUN · PRODUCTION</span>
      </div>
    `;
    document.body.prepend(bar);
    document.body.style.paddingTop = "42px";

    // 2. Interactive Cursor Visualizer
    const cursor = document.createElement("div");
    cursor.id = "demo-mouse-cursor";
    cursor.style.cssText = `
      position: fixed; width: 20px; height: 20px;
      background: rgba(14, 165, 233, 0.85); border: 2px solid #ffffff;
      border-radius: 50%; pointer-events: none; z-index: 99999999;
      transform: translate(-50%, -50%); transition: transform 0.1s ease-out, background 0.15s ease;
      box-shadow: 0 0 12px rgba(14,165,233,0.9);
    `;
    document.body.appendChild(cursor);

    window.__updateCursor = (x, y) => {
      cursor.style.left = x + "px";
      cursor.style.top = y + "px";
    };

    window.__clickCursor = () => {
      cursor.style.transform = "translate(-50%, -50%) scale(0.75)";
      cursor.style.background = "rgba(16, 185, 129, 0.95)";
      setTimeout(() => {
        cursor.style.transform = "translate(-50%, -50%) scale(1)";
        cursor.style.background = "rgba(14, 165, 233, 0.85)";
      }, 200);
    };

    // 3. Crisp On-Screen Subtitle Banner
    const sub = document.createElement("div");
    sub.id = "demo-subtitle-overlay";
    sub.style.cssText = `
      position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.94); color: #f8fafc; border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      padding: 12px 28px; border-radius: 9999px; font-size: 15px; font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      text-align: center; max-width: 88%; z-index: 9999998; box-shadow: 0 12px 30px -5px rgba(0,0,0,0.6);
      transition: opacity 0.3s ease, transform 0.3s ease; opacity: 0; line-height: 1.45;
    `;
    document.body.appendChild(sub);

    window.__setSubtitle = (text) => {
      if (!text) {
        sub.style.opacity = "0";
      } else {
        sub.innerText = text;
        sub.style.opacity = "1";
      }
    };
  });

  // Short settle wait for font and style stabilization
  await page.waitForTimeout(500);

  // Measure exact page ready offset
  const pageReadyOffsetSec = (Date.now() - rawRecordingStartTime) / 1000;
  console.log(`[Zero-Blank] Web application fully rendered at raw capture offset: ${pageReadyOffsetSec.toFixed(3)}s`);

  // ==========================================
  // DEMO TIMELINE STARTS NOW (t = 0.0s)
  // ==========================================
  const demoStartTime = Date.now();
  const getElapsedMs = () => Date.now() - demoStartTime;
  const getElapsedSec = () => (getElapsedMs() / 1000).toFixed(1);
  const logStep = (msg) => console.log(`[T+${getElapsedSec()}s] ${msg}`);

  async function waitTargetTime(targetSeconds) {
    const elapsed = getElapsedMs() / 1000;
    const remaining = targetSeconds - elapsed;
    if (remaining > 0) {
      await page.waitForTimeout(remaining * 1000);
    }
  }

  async function setSubtitle(text) {
    await page.evaluate((t) => window.__setSubtitle(t), text);
  }

  async function moveCursorTo(x, y, steps = 15) {
    await page.mouse.move(x, y, { steps });
    await page.evaluate(({ x, y }) => window.__updateCursor(x, y), { x, y });
  }

  async function clickLocator(locator) {
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(150);
    const box = await locator.boundingBox();
    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await moveCursorTo(cx, cy);
      await page.evaluate(() => window.__clickCursor());
      await page.waitForTimeout(150);
    }
    await locator.click();
    await page.waitForTimeout(250);
  }

  async function smoothScrollTo(targetY, durationMs = 800) {
    await page.evaluate(async ({ targetY, durationMs }) => {
      const startY = window.scrollY;
      const diff = targetY - startY;
      const startTime = performance.now();
      return new Promise((resolve) => {
        function step(now) {
          const progress = Math.min((now - startTime) / durationMs, 1);
          const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
          window.scrollTo(0, startY + diff * ease);
          if (progress < 1) requestAnimationFrame(step);
          else resolve();
        }
        requestAnimationFrame(step);
      });
    }, { targetY, durationMs });
    await page.waitForTimeout(300);
  }

  // Position cursor initially on ready UI
  await moveCursorTo(1500, 160);

  // ==========================================
  // SEGMENT 1 (00:00 - 00:15): Header & Scope Cards
  // ==========================================
  logStep("Segment 1: Header, public URL, and scope cards...");
  await waitTargetTime(1.0);
  eventDelaysMs["c1"] = getElapsedMs();
  await setSubtitle("We are OpsCrew. We built this expense exception prototype from zero in Google AI Studio Build. Gemini plans and reviews the handling steps. Our teammate used Antigravity to assist deployment.");

  await waitTargetTime(2.2);
  // Point to OpsCrew header
  await moveCursorTo(200, 165);
  await page.waitForTimeout(2500);

  // Move to AI Studio badge
  await moveCursorTo(720, 165);
  await page.waitForTimeout(2500);

  // Move across Architecture cards
  await moveCursorTo(300, 270);
  await page.waitForTimeout(1500);
  await moveCursorTo(600, 270);
  await page.waitForTimeout(1500);
  await moveCursorTo(900, 270);
  await page.waitForTimeout(1500);

  // Point to top Cloud Run production chrome bar
  await moveCursorTo(960, 20);
  await waitTargetTime(15.0);

  // ==========================================
  // SEGMENT 2 (00:15 - 00:35): Visitor Session & DEV-04 Intake
  // ==========================================
  logStep("Segment 2: Starting visitor session & DEV-04 intake...");
  eventDelaysMs["c2"] = getElapsedMs();
  await setSubtitle("I explicitly start a Firebase visitor session. This synthetic example is a thirty-eight-dollar parking expense for employee SYNTH-EMP-100, with a missing receipt.");

  // Scroll down to visitor session
  await smoothScrollTo(720, 600);
  const sessionBtn = page.locator('button:has-text("Start visitor session")');
  await clickLocator(sessionBtn);

  logStep("Waiting for Firebase visitor session active...");
  await page.waitForSelector("text=Firebase visitor session", { timeout: 20000 });
  await page.waitForTimeout(1000);

  // Scroll back up to Intake Form
  await smoothScrollTo(180, 600);
  logStep("Clicking Clear Form...");
  const clearBtn = page.locator('button:has-text("Clear Form")');
  await clickLocator(clearBtn);
  await page.waitForTimeout(500);

  // Enter DEV-04 facts
  logStep("Entering DEV-04 description...");
  const descLoc = page.locator("#expense-description");
  await descLoc.scrollIntoViewIfNeeded();
  const descBox = await descLoc.boundingBox();
  if (descBox) await moveCursorTo(descBox.x + 100, descBox.y + 30);
  await page.evaluate(() => window.__clickCursor());
  await descLoc.click();
  await descLoc.pressSequentially("[SYNTHETIC] Parking fee $38.00 for SYNTH-EMP-100. Receipt lost.", { delay: 35 });
  await page.waitForTimeout(400);

  // Enter Amount
  logStep("Entering amount 38.00...");
  const amtLoc = page.locator("#expense-amount-usd");
  const amtBox = await amtLoc.boundingBox();
  if (amtBox) await moveCursorTo(amtBox.x + 80, amtBox.y + 15);
  await page.evaluate(() => window.__clickCursor());
  await amtLoc.click();
  await amtLoc.pressSequentially("38.00", { delay: 60 });
  await page.waitForTimeout(300);

  // Select Missing Receipt
  logStep("Selecting missing receipt radio...");
  const missingRadio = page.locator('label[for="receipt-status-missing"]');
  await clickLocator(missingRadio);
  await page.waitForTimeout(300);

  // Enter Employee Identifier
  logStep("Entering employee identifier SYNTH-EMP-100...");
  const empLoc = page.locator("#employee-identifier");
  const empBox = await empLoc.boundingBox();
  if (empBox) await moveCursorTo(empBox.x + 80, empBox.y + 15);
  await page.evaluate(() => window.__clickCursor());
  await empLoc.click();
  await empLoc.pressSequentially("SYNTH-EMP-100", { delay: 50 });

  logStep("DEV-04 intake fully entered. Pausing for inspection...");
  await waitTargetTime(35.0);

  // ==========================================
  // SEGMENT 3 (00:35 - ~01:15): Analyze, Plan & Review (Live Gemini Multi-Agent)
  // ==========================================
  logStep("Segment 3: Triggering Analyze, plan & review...");
  eventDelaysMs["c3a"] = getElapsedMs();
  await setSubtitle("Gemini extracts facts, then a separately prompted Planner proposes handling steps. A Reviewer checks the proposal. This timer measures elapsed time.");

  const analyzeBtn = page.locator('button:has-text("Analyze, plan & review")').first();
  await analyzeBtn.scrollIntoViewIfNeeded();

  // Wait for button to be enabled in React state
  await page.waitForFunction(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("Analyze, plan & review"));
    return btn && !btn.disabled;
  }, { timeout: 15000 });

  await clickLocator(analyzeBtn);

  // Highlight the ticking timer as voice says "This timer measures elapsed time"
  await page.waitForTimeout(2000);
  await moveCursorTo(550, 480);
  await page.waitForTimeout(3000);

  logStep("Live Cloud Run multi-agent deliberating (Facts -> Planner -> Reviewer)...");
  // 90 second timeout to comfortably absorb retries
  await page.waitForSelector("text=Independent AI Reviewer", { timeout: 90000 });
  const modelDoneMs = getElapsedMs();
  logStep(`Multi-agent workflow completed at T+${(modelDoneMs / 1000).toFixed(1)}s!`);

  // Smooth scroll down to right panel results
  await smoothScrollTo(360, 800);

  // Ensure user has at least 3 seconds to see the completed card, with default floor at 70s
  const c3bStartSec = Math.max((modelDoneMs + 3000) / 1000, 70.0);
  await waitTargetTime(c3bStartSec);

  logStep("Segment 3B: Expanding telemetry details...");
  eventDelaysMs["c3b"] = getElapsedMs();
  await setSubtitle("Completed role attempts appear after the response; it is not live progress inside each stage.");

  // Expand "Run versions and completed-step telemetry"
  const teleSummary = page.locator('summary:has-text("Run versions and completed-step telemetry")');
  await clickLocator(teleSummary);
  await page.waitForTimeout(2000);

  // Smooth hover over completed role attempts
  await moveCursorTo(1150, 750);
  await page.waitForTimeout(3500);
  await moveCursorTo(1350, 750);
  await page.waitForTimeout(3500);

  // Floor at 95.0s (01:35)
  const c4StartSec = Math.max((getElapsedMs() + 3000) / 1000, 95.0);
  await waitTargetTime(c4StartSec);

  // ==========================================
  // SEGMENT 4: Inspect Decision, Citations & SYN-004
  // ==========================================
  logStep("Segment 4: Inspecting policy decision and clause SYN-004...");
  eventDelaysMs["c4"] = getElapsedMs();
  await setSubtitle("The current result requests receipt evidence. Clause SYN-004 asks for an itemized receipt or a written explanation. The passing plan and review grant no permission to create a case, reimburse or pay.");
  await smoothScrollTo(220, 700);
  await page.waitForTimeout(1500);

  // Hover over decision: EVIDENCE_REQUEST
  logStep("Hovering over EVIDENCE_REQUEST...");
  await moveCursorTo(1100, 280);
  await page.waitForTimeout(3500);

  // Hover over SYN-004 clause
  logStep("Inspecting SYN-004 citation...");
  const syn004Loc = page.locator('text=SYN-004').first();
  if (await syn004Loc.count() > 0) {
    const sBox = await syn004Loc.boundingBox();
    if (sBox) await moveCursorTo(sBox.x + 30, sBox.y + 10);
  }
  await page.waitForTimeout(4500);

  // Scroll to Reviewer PASS verdict
  logStep("Inspecting Reviewer PASS verdict...");
  const passLoc = page.locator('text=PASS').first();
  if (await passLoc.count() > 0) {
    const pBox = await passLoc.boundingBox();
    if (pBox) await moveCursorTo(pBox.x + 20, pBox.y + 10);
  }
  await page.waitForTimeout(4000);

  // Scroll down to Employee Notice Draft
  await smoothScrollTo(430, 600);
  await moveCursorTo(1150, 520);
  await page.waitForTimeout(3500);

  // Floor at 128.0s (02:08)
  const c5StartSec = Math.max((getElapsedMs() + 3000) / 1000, 128.0);
  await waitTargetTime(c5StartSec);

  // ==========================================
  // SEGMENT 5: Human Confirmation & Atomic Case Creation
  // ==========================================
  logStep("Segment 5: Human Confirmation...");
  eventDelaysMs["c5"] = getElapsedMs();
  await setSubtitle("I prepare human confirmation, inspect this specific plan, and explicitly authorize the synthetic exception record. The checkbox starts unchecked. I now submit that authorization.");
  await smoothScrollTo(720, 700);
  await page.waitForTimeout(1000);

  logStep("Clicking Prepare human confirmation...");
  const prepBtn = page.locator('button:has-text("Prepare human confirmation")');
  await clickLocator(prepBtn);
  await page.waitForTimeout(1200);

  // Demonstrate authorization checkbox is initially UNCHECKED
  logStep("Demonstrating authorization checkbox is initially UNCHECKED (hovering for 4.5s)...");
  const cbLoc = page.locator('input[type="checkbox"]');
  await cbLoc.waitFor({ state: "visible", timeout: 10000 });
  const cbBox = await cbLoc.boundingBox();
  if (cbBox) await moveCursorTo(cbBox.x + 8, cbBox.y + 8);
  await page.waitForTimeout(4500);

  logStep("Checking authorization checkbox...");
  await page.evaluate(() => window.__clickCursor());
  await cbLoc.check();
  await page.waitForTimeout(1500);

  logStep("Clicking Confirm & create synthetic case...");
  const confirmBtn = page.locator('button:has-text("Confirm & create synthetic case")');
  await clickLocator(confirmBtn);

  logStep("Waiting for verified readback...");
  await page.waitForSelector("text=Saved case verified by independent readback", { timeout: 20000 });
  await page.waitForTimeout(2000);

  // Floor at 148.0s (02:28)
  const c6StartSec = Math.max((getElapsedMs() + 3000) / 1000, 148.0);
  await waitTargetTime(c6StartSec);

  // ==========================================
  // SEGMENT 6: Saved Case Readback & History Verification
  // ==========================================
  logStep("Segment 6: Independent readback verification & history...");
  eventDelaysMs["c6"] = getElapsedMs();
  await setSubtitle("Success appears only after a separate read of the saved record. I refresh this visitor's history and reopen the same case. OpsCrew does not approve reimbursement, issue payment or send a message automatically.");

  // Hover over verified case card
  await moveCursorTo(1100, 680);
  await page.waitForTimeout(3000);

  // Click Refresh history
  logStep("Clicking Refresh history...");
  const refreshBtn = page.locator('button:has-text("Refresh history")');
  await clickLocator(refreshBtn);
  await page.waitForTimeout(2000);

  // Click Open & verify case if available
  logStep("Verifying case in history list...");
  const openBtn = page.locator('button:has-text("Open & verify case")').first();
  if (await openBtn.count() > 0) {
    await clickLocator(openBtn);
    await page.waitForTimeout(2500);
  }

  // Graceful concluding hold until exactly 165.0s
  logStep("Holding final verified state until 165s mark...");
  await waitTargetTime(165.0);

  logStep("Closing browser context and finalizing raw recording...");
  await context.close();
  await browser.close();

  // Find recorded raw WebM
  const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith(".webm"));
  if (files.length === 0) {
    throw new Error("No webm video recorded in " + RAW_DIR);
  }
  const rawFile = path.join(RAW_DIR, files[0]);
  console.log("\nRaw recording saved to:", rawFile);

  // Generate synchronized master audio and subtitles
  const masterAudio = buildMasterAudio(AUDIO_DIR, eventDelaysMs, clipDurations, 165.0);
  const { srtFile, vttFile } = generateSubtitles(eventDelaysMs, clipDurations);

  const finalMp4 = path.join(OUTPUT_DIR, "OpsCrew_Cloud_Demo_165s.mp4");

  console.log(`[Zero-Blank Muxing] Trimming initial ${pageReadyOffsetSec.toFixed(3)}s loading blank from raw capture...`);
  console.log("Transcoding MP4 with ffmpeg (H.264 / 1080p + Synchronized Voice Audio)...");

  // Cut away initial page loading with -ss ${pageReadyOffsetSec.toFixed(3)}
  execSync(
    `ffmpeg -y -ss ${pageReadyOffsetSec.toFixed(3)} -i "${rawFile}" -i "${masterAudio}" -t 165.0 -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r 25 -c:a aac -b:a 192k -ar 48000 -map 0:v:0 -map 1:a:0 -shortest "${finalMp4}"`,
    { stdio: "inherit" }
  );

  const durationStr = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalMp4}"`
  ).toString().trim();
  const durNum = parseFloat(durationStr);

  const sha256 = execSync(`shasum -a 256 "${finalMp4}"`).toString().split(" ")[0];

  console.log("\n=======================================================");
  console.log("       LIVE CLOUD RECORDING COMPLETED SUCCESSFULLY     ");
  console.log("=======================================================");
  console.log("Video File:    ", finalMp4);
  console.log("SRT Subtitles: ", srtFile);
  console.log("VTT Subtitles: ", vttFile);
  console.log(`Measured Time:  ${durNum.toFixed(2)} seconds (Target: ~165s, Limit: <180s: ${durNum < 180 ? "PASS" : "FAIL"})`);
  console.log("Video SHA256:  ", sha256);
  console.log("Trimmed Blank: ", `${pageReadyOffsetSec.toFixed(3)} seconds removed from raw start`);
  console.log("Raw WebM:      ", rawFile);
  console.log("Master Audio:  ", masterAudio);
  console.log("=======================================================\n");
}

run().catch((err) => {
  console.error("Recording error:", err);
  process.exit(1);
});
