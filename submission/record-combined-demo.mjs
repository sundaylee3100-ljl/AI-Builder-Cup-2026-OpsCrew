import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const TARGET_URL = "https://opscrew-883881551915.us-central1.run.app";
const PROXY_SERVER = "http://127.0.0.1:7897";
const OUTPUT_DIR = path.resolve("submission/video_output");
const RAW_DIR = path.resolve("submission/video_output/raw_p2");
const AUDIO_DIR = path.resolve("submission/video_output/audio_p2");

if (fs.existsSync(RAW_DIR)) {
  fs.rmSync(RAW_DIR, { recursive: true, force: true });
}
fs.mkdirSync(RAW_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });

// Part 1 Video File (already rendered)
const PART1_VIDEO = path.join(OUTPUT_DIR, "part1_slides.mp4");
const PART1_DURATION = 20.02; // exact duration in seconds matching render-part1-slides.py

// Part 3 Video File (Outro / Thank You)
const PART3_VIDEO = path.join(OUTPUT_DIR, "part3_outro.mp4");
const PART3_DURATION = 12.00;
const PART2_DURATION = 76.00;

// Part 2 Clips Configuration (Total Duration = 76.0s)
const PART2_CLIPS = [
  {
    id: "p2_c1",
    delayMs: 500, // 00:00.50 relative to Part 2 start
    text: "I explicitly start a Firebase visitor session. This synthetic example is a thirty-eight-dollar parking expense for employee SYNTH-EMP-100, with a missing receipt.",
    sub: "I explicitly start a Firebase visitor session. Synthetic example DEV-04 is a\n$38 parking expense for employee SYNTH-EMP-100, with a missing receipt."
  },
  {
    id: "p2_c2",
    delayMs: 12500, // 00:12.50
    text: "Gemini extracts facts, then a separately prompted Planner proposes handling steps. A Reviewer checks the proposal. This timer measures elapsed time.",
    sub: "Gemini extracts facts, then a separately prompted Planner proposes handling steps.\nA Reviewer checks the proposal. This timer measures elapsed time."
  },
  {
    id: "p2_c3",
    delayMs: 30000, // 00:30.00
    text: "Completed role attempts appear after the response; it is not live progress inside each stage.",
    sub: "Completed role attempts appear after the response; it is not live progress inside each stage."
  },
  {
    id: "p2_c4",
    delayMs: 35500, // 00:35.50
    text: "The current result requests receipt evidence. Clause SYN-004 asks for an itemized receipt or a written explanation. The passing plan and review grant no permission to create a case, reimburse or pay.",
    sub: "The result requests receipt evidence. Clause SYN-004 asks for an itemized receipt or explanation.\nThe passing plan and review grant no permission to create a case, reimburse or pay."
  },
  {
    id: "p2_c5",
    delayMs: 47500, // 00:47.50
    text: "I prepare human confirmation, inspect this specific plan, and explicitly authorize the synthetic exception record. The checkbox starts unchecked. I now submit that authorization.",
    sub: "I prepare human confirmation, inspect this specific plan, and explicitly authorize the record.\nThe checkbox starts unchecked. I now submit that authorization."
  },
  {
    id: "p2_c6",
    delayMs: 58500, // 00:58.50
    text: "Success appears only after a separate read of the saved record from Firestore. The case record is atomic and policy-verified.",
    sub: "Success appears only after a separate read of the saved record from Firestore.\nThe case record is atomic and policy-verified."
  },
  {
    id: "p2_c7",
    delayMs: 66000, // 01:06.00
    text: "I refresh visitor history and reopen the same case to verify state parity. OpsCrew requires human authorization and never issues payment automatically.",
    sub: "I refresh visitor history and reopen the same case to verify state parity.\nOpsCrew requires human authorization and never issues payment automatically."
  }
];

// Pre-render Part 2 audio clips
function prepareAudioClips(audioDir) {
  console.log("=== Synthesizing Part 2 Narration Clips (Samantha -r 170) ===");
  const clipDurations = {};
  for (let i = 0; i < PART2_CLIPS.length; i++) {
    const c = PART2_CLIPS[i];
    const aiffPath = path.join(audioDir, `${c.id}.aiff`);
    const wavPath = path.join(audioDir, `${c.id}.wav`);
    console.log(`[TTS] Synthesizing Part 2 clip ${i + 1}/${PART2_CLIPS.length} (${c.id})...`);
    execSync(`say -v Samantha -r 170 "${c.text.replace(/"/g, '\\"')}" -o "${aiffPath}"`);
    execSync(`ffmpeg -y -i "${aiffPath}" -ar 48000 -ac 2 "${wavPath}"`, { stdio: "ignore" });
    const durStr = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${wavPath}"`).toString().trim();
    clipDurations[c.id] = parseFloat(durStr);
    console.log(`[TTS] ${c.id}: ${clipDurations[c.id].toFixed(2)}s`);
  }
  return clipDurations;
}

// Assemble Part 2 master audio track
function buildPart2MasterAudio(audioDir, clipDurations, totalSec = PART2_DURATION) {
  console.log(`\n=== Assembling Part 2 Master Audio Track (${totalSec.toFixed(1)}s) ===`);
  const inputs = [`-f lavfi -t ${totalSec.toFixed(2)} -i anullsrc=r=48000:cl=stereo`];
  const filterParts = ["[0:a]anull[a0]"];

  for (let i = 0; i < PART2_CLIPS.length; i++) {
    const c = PART2_CLIPS[i];
    const wavPath = path.join(audioDir, `${c.id}.wav`);
    inputs.push(`-i "${wavPath}"`);
    filterParts.push(`[${i + 1}:a]adelay=${c.delayMs}|${c.delayMs}[a${i + 1}]`);
  }

  const totalInputs = PART2_CLIPS.length + 1;
  const mixInputs = Array.from({ length: totalInputs }, (_, i) => `[a${i}]`).join("");
  const filterStr = `${filterParts.join(";")};${mixInputs}amix=inputs=${totalInputs}:duration=longest:dropout_transition=0:normalize=0,highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`;
  const masterAudio = path.join(audioDir, "part2_master_audio.wav");

  execSync(
    `ffmpeg -y ${inputs.join(" ")} -filter_complex "${filterStr}" -map "[aout]" -t ${totalSec.toFixed(2)} -ar 48000 -ac 2 "${masterAudio}"`,
    { stdio: "ignore" }
  );

  const dur = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${masterAudio}"`
  ).toString().trim();
  console.log(`[Mastering] Part 2 master audio ready: ${dur}s\n`);
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

function generateCombinedSubtitles(part1DurationSec, part2DurationSec, part2ClipDurations) {
  console.log("=== Generating Combined Subtitles (SRT & VTT) ===");
  const part1Entries = [
    {
      startMs: 500,
      endMs: 9500,
      text: "Welcome to OpsCrew, an autonomous multi-agent copilot\nbuilt in Google AI Studio Build for the AI Builder Cup 2026."
    },
    {
      startMs: 9900,
      endMs: 20000,
      text: "Deployed on Google Cloud Run with dual-mode Vertex AI & Gemini API, Firestore, and Secret Manager.\nNow, let us examine OpsCrew operating live in production."
    }
  ];

  const part2BaseMs = Math.round(part1DurationSec * 1000);
  const allEntries = [...part1Entries];

  for (let i = 0; i < PART2_CLIPS.length; i++) {
    const c = PART2_CLIPS[i];
    const startMs = part2BaseMs + c.delayMs;
    const durMs = Math.round((part2ClipDurations[c.id] + 0.6) * 1000);
    const endMs = startMs + durMs;
    allEntries.push({
      startMs,
      endMs,
      text: c.sub
    });
  }

  // Part 3 Outro Entry
  const part3BaseMs = part2BaseMs + Math.round(part2DurationSec * 1000);
  allEntries.push({
    startMs: part3BaseMs + 500,
    endMs: part3BaseMs + 11500,
    text: "Thank you for watching! Explore OpsCrew live on Google Cloud Run.\nAutonomous multi-agent copilot built for the AI Builder Cup 2026."
  });

  let srt = "";
  let vtt = "WEBVTT\n\n";

  for (let i = 0; i < allEntries.length; i++) {
    const e = allEntries[i];
    srt += `${i + 1}\n${formatSrtTime(e.startMs)} --> ${formatSrtTime(e.endMs)}\n${e.text}\n\n`;
    vtt += `${formatVttTime(e.startMs)} --> ${formatVttTime(e.endMs)}\n${e.text}\n\n`;
  }

  const srtFile = path.join(OUTPUT_DIR, "OpsCrew_Combined_Official_Demo_165s.srt");
  const vttFile = path.join(OUTPUT_DIR, "OpsCrew_Combined_Official_Demo_165s.vtt");
  fs.writeFileSync(srtFile, srt.trim() + "\n", "utf8");
  fs.writeFileSync(vttFile, vtt.trim() + "\n", "utf8");
  console.log("Subtitles generated:", srtFile, vttFile);
  return { srtFile, vttFile };
}

async function run() {
  console.log("===============================================================================");
  console.log("     OpsCrew Combined Official Demo Recording (Slides + Live Cloud Run)        ");
  console.log("===============================================================================");
  console.log("Target Cloud URL:", TARGET_URL);
  console.log("Proxy Server:    ", PROXY_SERVER);

  if (!fs.existsSync(PART1_VIDEO)) {
    console.log(`[Part 1] ${PART1_VIDEO} not found. Automatically rendering slides via python3 submission/render-part1-slides.py...`);
    execSync("python3 submission/render-part1-slides.py", { stdio: "inherit" });
  }

  const clipDurations = prepareAudioClips(AUDIO_DIR);
  const part2MasterAudio = buildPart2MasterAudio(AUDIO_DIR, clipDurations, PART2_DURATION);

  console.log("\n[Playwright] Launching Chrome with explicit 1920x1080 window size...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    proxy: { server: PROXY_SERVER },
    args: [
      "--window-size=1920,1080",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-infobars",
      "--force-device-scale-factor=1"
    ]
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

  // Inject top chrome bar, custom cursor, and safe-height subtitle capsule (bottom: 75px)
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

    // 3. Subtitle Capsule positioned at bottom: 75px (Safe title zone, clears player controls!)
    const sub = document.createElement("div");
    sub.id = "demo-subtitle-overlay";
    sub.style.cssText = `
      position: fixed; bottom: 75px; left: 50%; transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.94); color: #f8fafc; border: 2px solid rgba(56, 189, 248, 0.85);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      padding: 12px 36px; border-radius: 9999px; font-size: 17px; font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      text-align: center; max-width: 86%; z-index: 9999998; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.6);
      transition: opacity 0.25s ease, transform 0.25s ease; opacity: 0; line-height: 1.45;
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

  await page.waitForTimeout(600);

  // Exact page ready offset in raw recording WebM
  const pageReadyOffsetSec = (Date.now() - rawRecordingStartTime) / 1000;
  console.log(`[Zero-Blank] Part 2 Web application ready at raw offset: ${pageReadyOffsetSec.toFixed(3)}s`);

  // =========================================================================
  // PART 2 TIMELINE (0.0s to 82.0s)
  // =========================================================================
  const demoStartTime = Date.now();
  const getElapsedMs = () => Date.now() - demoStartTime;
  const getElapsedSec = () => (getElapsedMs() / 1000).toFixed(1);
  const logStep = (msg) => console.log(`[Part2 T+${getElapsedSec()}s] ${msg}`);

  async function waitTargetTime(targetSeconds) {
    const elapsed = getElapsedMs() / 1000;
    const remaining = targetSeconds - elapsed;
    if (remaining > 0) {
      await page.waitForTimeout(remaining * 1000);
    }
  }

  async function setSubtitle(text, durMs = 0) {
    await page.evaluate(({ text, durMs }) => {
      window.__setSubtitle(text);
      if (window.__subTimer) clearTimeout(window.__subTimer);
      if (text && durMs > 0) {
        window.__subTimer = setTimeout(() => {
          window.__setSubtitle("");
        }, durMs);
      }
    }, { text, durMs });
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

  // Initial cursor position
  await moveCursorTo(1450, 160);

  // ==========================================
  // SEGMENT 1 (00:00 - 00:12.5): Visitor Session & DEV-04 Intake
  // ==========================================
  logStep("Segment 1: Start visitor session & DEV-04 intake...");
  await waitTargetTime(0.5);
  const c1DurMs = Math.round((clipDurations["p2_c1"] + 0.6) * 1000);
  await setSubtitle(PART2_CLIPS[0].sub, c1DurMs);

  // Click start visitor session
  await smoothScrollTo(720, 500);
  const sessionBtn = page.locator('button:has-text("Start visitor session")');
  await clickLocator(sessionBtn);

  logStep("Waiting for Firebase visitor session active...");
  await page.waitForSelector("text=Firebase visitor session", { timeout: 20000 });
  await page.waitForTimeout(400);

  // Scroll back to form
  await smoothScrollTo(180, 500);
  const clearBtn = page.locator('button:has-text("Clear Form")');
  await clickLocator(clearBtn);
  await page.waitForTimeout(200);

  // Enter DEV-04 facts
  logStep("Entering DEV-04 description...");
  const descLoc = page.locator("#expense-description");
  await descLoc.scrollIntoViewIfNeeded();
  const descBox = await descLoc.boundingBox();
  if (descBox) await moveCursorTo(descBox.x + 100, descBox.y + 30);
  await page.evaluate(() => window.__clickCursor());
  await descLoc.click();
  await descLoc.pressSequentially("[SYNTHETIC] Parking fee $38.00 for SYNTH-EMP-100. Receipt lost.", { delay: 20 });
  await page.waitForTimeout(150);

  // Enter Amount
  logStep("Entering amount 38.00...");
  const amtLoc = page.locator("#expense-amount-usd");
  const amtBox = await amtLoc.boundingBox();
  if (amtBox) await moveCursorTo(amtBox.x + 80, amtBox.y + 15);
  await page.evaluate(() => window.__clickCursor());
  await amtLoc.click();
  await amtLoc.pressSequentially("38.00", { delay: 30 });
  await page.waitForTimeout(150);

  // Select Missing Receipt
  logStep("Selecting missing receipt radio...");
  const missingRadio = page.locator('label[for="receipt-status-missing"]');
  await clickLocator(missingRadio);
  await page.waitForTimeout(150);

  // Enter Employee Identifier
  logStep("Entering employee identifier SYNTH-EMP-100...");
  const empLoc = page.locator("#employee-identifier");
  const empBox = await empLoc.boundingBox();
  if (empBox) await moveCursorTo(empBox.x + 80, empBox.y + 15);
  await page.evaluate(() => window.__clickCursor());
  await empLoc.click();
  await empLoc.pressSequentially("SYNTH-EMP-100", { delay: 30 });

  // Glide cursor to Analyze button
  const analyzeBtn = page.locator('button:has-text("Analyze, plan & review")').first();
  await analyzeBtn.scrollIntoViewIfNeeded();
  const aBox = await analyzeBtn.boundingBox();
  if (aBox) await moveCursorTo(aBox.x + aBox.width / 2, aBox.y + aBox.height / 2);

  await waitTargetTime(12.5);

  // ==========================================
  // SEGMENT 2 (00:12.5 - 00:30.0): Run Multi-Agent Review & Deliberation
  // ==========================================
  logStep("Segment 2: Triggering Analyze, plan & review...");
  const c2DurMs = Math.round((clipDurations["p2_c2"] + 0.6) * 1000);
  await setSubtitle(PART2_CLIPS[1].sub, c2DurMs);

  await clickLocator(analyzeBtn);

  logStep("Waiting for telemetry timer badge...");
  try {
    await page.waitForSelector('text=Run versions and completed-step telemetry', { timeout: 60000 });
    logStep("Gemini multi-agent workflow deliberation completed successfully!");
  } catch (e) {
    console.warn("[WARN] Waiting for telemetry summary timed out, checking result containers...", e.message);
  }

  // Smooth hover over right panel
  await moveCursorTo(1350, 420);
  await waitTargetTime(30.0);

  // ==========================================
  // SEGMENT 3 (00:30.0 - 00:35.5): Inspect Completed Telemetry
  // ==========================================
  logStep("Segment 3: Expanding telemetry details...");
  const c3DurMs = Math.round((clipDurations["p2_c3"] + 0.6) * 1000);
  await setSubtitle(PART2_CLIPS[2].sub, c3DurMs);
  await smoothScrollTo(360, 400);

  const teleSummary = page.locator('summary:has-text("Run versions and completed-step telemetry")');
  await clickLocator(teleSummary);
  await page.waitForTimeout(600);

  await moveCursorTo(1150, 750);
  await page.waitForTimeout(1200);
  await moveCursorTo(1350, 750);
  await page.waitForTimeout(1000);

  await waitTargetTime(35.5);

  // ==========================================
  // SEGMENT 4 (00:35.5 - 00:47.5): Inspect SYN-004 & Decision
  // ==========================================
  logStep("Segment 4: Inspecting decision and clause SYN-004...");
  const c4DurMs = Math.round((clipDurations["p2_c4"] + 0.6) * 1000);
  await setSubtitle(PART2_CLIPS[3].sub, c4DurMs);
  await smoothScrollTo(220, 500);
  await page.waitForTimeout(400);

  logStep("Hovering over EVIDENCE_REQUEST...");
  await moveCursorTo(1100, 280);
  await page.waitForTimeout(1600);

  logStep("Inspecting SYN-004 citation...");
  const syn004Loc = page.locator('text=SYN-004').first();
  if (await syn004Loc.count() > 0) {
    const sBox = await syn004Loc.boundingBox();
    if (sBox) await moveCursorTo(sBox.x + 30, sBox.y + 10);
  }
  await page.waitForTimeout(1800);

  logStep("Inspecting Reviewer PASS verdict...");
  const passLoc = page.locator('text=PASS').first();
  if (await passLoc.count() > 0) {
    const pBox = await passLoc.boundingBox();
    if (pBox) await moveCursorTo(pBox.x + 20, pBox.y + 10);
  }
  await page.waitForTimeout(1800);

  // Scroll down to Employee Notice Pre-Draft
  logStep("Inspecting Employee Notice Pre-Draft...");
  await smoothScrollTo(430, 500);
  await moveCursorTo(1150, 520);
  await page.waitForTimeout(2000);

  // Glide cursor down towards Human Confirmation
  await moveCursorTo(1150, 700);

  await waitTargetTime(47.5);

  // ==========================================
  // SEGMENT 5 (00:47.5 - 00:58.5): Human Confirmation (Unchecked Pause)
  // ==========================================
  logStep("Segment 5: Human Confirmation with explicit unchecked pause...");
  const c5DurMs = Math.round((clipDurations["p2_c5"] + 0.6) * 1000);
  await setSubtitle(PART2_CLIPS[4].sub, c5DurMs);
  await smoothScrollTo(720, 500);
  await page.waitForTimeout(300);

  logStep("Clicking Prepare human confirmation...");
  const prepBtn = page.locator('button:has-text("Prepare human confirmation")');
  await clickLocator(prepBtn);
  await page.waitForTimeout(400);

  // Move cursor directly over the authorization checkbox and hold for 2.0 seconds UNCHECKED!
  logStep("Demonstrating authorization checkbox is initially UNCHECKED (hovering for 2.0s)...");
  const cbLoc = page.locator('input[type="checkbox"]');
  await cbLoc.waitFor({ state: "visible", timeout: 10000 });
  const cbBox = await cbLoc.boundingBox();
  if (cbBox) await moveCursorTo(cbBox.x + 8, cbBox.y + 8);
  await page.waitForTimeout(2000);

  logStep("Now checking authorization checkbox...");
  await page.evaluate(() => window.__clickCursor());
  await cbLoc.check();
  await page.waitForTimeout(500);

  logStep("Clicking Confirm & create synthetic case...");
  const confirmBtn = page.locator('button:has-text("Confirm & create synthetic case")');
  await clickLocator(confirmBtn);

  logStep("Waiting for verified readback...");
  await page.waitForSelector("text=Saved case verified by independent readback", { timeout: 20000 });

  await waitTargetTime(58.5);

  // ==========================================
  // SEGMENT 6A (00:58.5 - 01:06.0): Independent Readback & Firestore Persistence
  // ==========================================
  logStep("Segment 6A: Independent readback verification & Firestore centering...");
  const c6DurMs = Math.round((clipDurations["p2_c6"] + 0.6) * 1000);
  await setSubtitle(PART2_CLIPS[5].sub, c6DurMs);

  // IMMEDIATELY smooth scroll down to 950 to clearly center the verified receipt and history container in viewport
  await smoothScrollTo(950, 600);
  await page.waitForTimeout(300);

  logStep("Inspecting readback verification banner...");
  const bannerLoc = page.locator('text=Saved case verified by independent readback').first();
  if (await bannerLoc.count() > 0) {
    const box = await bannerLoc.boundingBox();
    if (box) await moveCursorTo(box.x + box.width / 2, box.y + box.height / 2);
  }
  await page.waitForTimeout(1500);

  // Hover over verified case record and Case ID
  logStep("Inspecting verified Case ID...");
  const caseIdLoc = page.locator('text=Saved case verified by independent readback').locator('..').locator('dd.font-mono').first();
  if (await caseIdLoc.count() > 0) {
    const b = await caseIdLoc.boundingBox();
    if (b) await moveCursorTo(b.x + b.width / 2, b.y + b.height / 2);
  } else {
    await moveCursorTo(1100, 520);
  }
  await page.waitForTimeout(2000);

  // Glide towards Refresh history button
  const refreshBtn = page.locator('button:has-text("Refresh history")');
  if (await refreshBtn.count() > 0) {
    const rBox = await refreshBtn.boundingBox();
    if (rBox) await moveCursorTo(rBox.x + rBox.width / 2, rBox.y + rBox.height / 2);
  }

  await waitTargetTime(66.0);

  // ==========================================
  // SEGMENT 6B (01:06.0 - 01:16.0): History Parity & Reopen Verification
  // ==========================================
  logStep("Segment 6B: Refreshing history and reopening saved case...");
  const c7DurMs = Math.round((clipDurations["p2_c7"] + 0.6) * 1000);
  await setSubtitle(PART2_CLIPS[6].sub, c7DurMs);

  // Click Refresh history
  logStep("Clicking Refresh history...");
  await clickLocator(refreshBtn);
  await page.waitForTimeout(800);

  // Click Open & verify case on the top history item
  logStep("Clicking Open & verify case on saved case...");
  const openBtn = page.locator('button:has-text("Open & verify case")').first();
  if (await openBtn.count() > 0) {
    await clickLocator(openBtn);
    await page.waitForTimeout(1000);
  }

  // Hover over reopened case verification notice
  logStep("Inspecting reopened case verification notice...");
  const noticeLoc = page.locator('text=Saved case verified through a separate read request');
  if (await noticeLoc.count() > 0) {
    const nBox = await noticeLoc.boundingBox();
    if (nBox) await moveCursorTo(nBox.x + 150, nBox.y + 10);
  } else {
    await moveCursorTo(1050, 680);
  }
  await page.waitForTimeout(2500);

  // Smoothly move cursor towards center for a clean closing presentation
  await moveCursorTo(960, 540);

  // Graceful concluding hold until exactly 76.0s
  logStep("Holding final verified state until 76.0s mark (calm conclusion)...");
  await waitTargetTime(76.0);

  logStep("Closing browser context...");
  await context.close();
  await browser.close();

  // Find recorded WebM
  const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith(".webm"));
  if (files.length === 0) {
    throw new Error("No webm video recorded in " + RAW_DIR);
  }
  const rawFile = path.join(RAW_DIR, files[0]);
  console.log("\nRaw Part 2 recording:", rawFile);

  // Transcode Part 2 video (trim blank and mux with mastered audio)
  const part2Mp4 = path.join(OUTPUT_DIR, "part2_demo.mp4");
  console.log(`[Zero-Blank Trimming] Removing ${pageReadyOffsetSec.toFixed(3)}s loading blank from Part 2 raw capture...`);

  execSync(
    `ffmpeg -y -ss ${pageReadyOffsetSec.toFixed(3)} -i "${rawFile}" -i "${part2MasterAudio}" -t ${PART2_DURATION.toFixed(1)} -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r 25 -c:a aac -b:a 192k -ar 48000 -map 0:v:0 -map 1:a:0 -shortest "${part2Mp4}"`,
    { stdio: "inherit" }
  );

  const p2Dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${part2Mp4}"`).toString().trim());
  console.log(`Part 2 demo ready: ${part2Mp4} (${p2Dur.toFixed(2)}s)`);

  // =========================================================================
  // CONCATENATE PART 1 (SLIDES) + PART 2 (LIVE DEMO) + PART 3 (OUTRO)
  // =========================================================================
  console.log("\n=== Seamlessly Concatenating Part 1 (Slides), Part 2 (Live Cloud Demo) & Part 3 (Outro) ===");
  const finalCombinedMp4 = path.join(OUTPUT_DIR, "OpsCrew_Combined_Official_Demo_165s.mp4");

  execSync(
    `ffmpeg -y -i "${PART1_VIDEO}" -i "${part2Mp4}" -i "${PART3_VIDEO}" -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[v][a]" -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r 25 -c:a aac -b:a 192k -ar 48000 "${finalCombinedMp4}"`,
    { stdio: "inherit" }
  );

  const finalDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalCombinedMp4}"`).toString().trim());
  const sha256 = execSync(`shasum -a 256 "${finalCombinedMp4}"`).toString().split(" ")[0];

  // Generate unified subtitles
  const { srtFile, vttFile } = generateCombinedSubtitles(PART1_DURATION, PART2_DURATION, clipDurations);

  console.log("\n===============================================================================");
  console.log("       COMBINED OFFICIAL DEMO VIDEO GENERATED SUCCESSFULLY!                    ");
  console.log("===============================================================================");
  console.log("Final Video File: ", finalCombinedMp4);
  console.log("SRT Subtitles:    ", srtFile);
  console.log("VTT Subtitles:    ", vttFile);
  console.log(`Measured Duration: ${finalDur.toFixed(2)} seconds (Limit: <180s: ${finalDur < 180 ? "PASS" : "FAIL"})`);
  console.log("SHA256 Checksum:  ", sha256);
  console.log("Part 1 (Slides):  ", `${PART1_DURATION}s`);
  console.log("Part 2 (Demo):    ", `${p2Dur.toFixed(2)}s`);
  console.log("Part 3 (Outro):   ", `${PART3_DURATION}s`);
  console.log("===============================================================================\n");
}

run().catch((err) => {
  console.error("Recording error:", err);
  process.exit(1);
});
