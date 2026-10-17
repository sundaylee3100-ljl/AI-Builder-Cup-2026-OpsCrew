/** Offline submission-portal revision: 3–4 minutes, unchanged original-speed UI. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const submission = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(submission);
const cliSource = process.argv.find(a => a.startsWith('--input='))?.slice(8);
const source = cliSource ? path.resolve(cliSource) : path.join(submission, 'Original_Recorded_Demo_2026-10-16.mp4');
const stem = 'OpsCrew_Submission_Demo_3to4min_2026-10-16';
const output = path.join(submission, stem + '.mp4');
const work = path.join(root, '.review-media-3to4-20261016');
const evidence = path.join(root, 'docs', 'acceptance');
const allowedSourceHashes = ['79b6bbef75b76ce236de25a4364fe911697c6c28acfc4f12681bd79441c90c43', 'cb64b670e057709cdcb85aa55dde7e2f05fbc3eb3490042cd13eacd4c36a6772'];
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run = (exe, args, options = {}) => execFileSync(exe, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, ...options });
const probe = p => JSON.parse(run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', p]));
const fps = 25;
const filterPath = p => p.replaceAll('\\', '/').replaceAll(':', '\\:').replaceAll("'", "\\'");
const font = filterPath('C:/Windows/Fonts/segoeui.ttf');
const bold = filterPath('C:/Windows/Fonts/segoeuib.ttf');
let actualSourceHash;

const timeline = [
  { id: 'intro', kind: 'card', title: 'OpsCrew', eyebrow: 'EXPENSE EXCEPTION PLAN & REVIEW', subtitle: 'AI assistance. Human confirmation. Verified saved cases.', body: ['A practical finance-operations copilot', 'Synthetic expenses and demonstration policy', 'Recorded walkthrough with factual explanations'], cues: [
    'Meet OpsCrew, our expense operations copilot. It helps an operator understand an exception, choose a next step, and keep control of the record.',
    'This walkthrough uses synthetic data and a demonstration policy. It shows assistance and case handling, rather than a payment system.'
  ] },
  { id: 'problem', kind: 'card', title: 'A missing receipt creates work', eyebrow: 'THE PROBLEM', subtitle: 'Turn scattered expense facts into a reviewable next action.', body: ['Capture the facts', 'Explain the relevant policy', 'Ask for missing evidence before proceeding'], cues: [
    'An incomplete expense can mean repeated checks and follow-up. An operator needs to know what is missing and why it matters.',
    'OpsCrew brings the facts, policy references, and suggested action into one reviewable workflow, while leaving the decision with a person.'
  ] },
  { id: 'build', kind: 'card', title: 'Built with Google technology', eyebrow: 'FROM IDEA TO CLOUD PROTOTYPE', subtitle: 'Google AI Studio Build  →  Gemini  →  Google Cloud', body: ['Application created in Google AI Studio Build', 'Team used Antigravity for deployment work', 'Cloud Run + Firebase Authentication + Cloud Firestore'], cues: [
    'We started the application in Google AI Studio Build. Our teammate used Antigravity for the Google Cloud deployment work.',
    'Cloud Run hosts the service. Firebase Authentication identifies the visitor, and Cloud Firestore stores confirmed cases. Gemini is called through the server.',
    'The model credentials stay on the server, outside the browser bundle.'
  ] },
  { id: 'intake', kind: 'recording', start: 24.04, recordedDuration: 14, title: '1 / START A VISITOR SESSION', cues: [
    'First, we start a visitor session and enter a synthetic parking expense: thirty-eight dollars, with a missing receipt.',
    'These text and form inputs are what the system checks. It does not read receipt images.'
  ] },
  { id: 'rolemap', kind: 'card', title: 'Three roles, separate questions', eyebrow: 'HOW GEMINI SUPPORTS THE WORKFLOW', subtitle: 'FACTS  →  PLANNER  →  REVIEWER', body: ['Facts: extract the submitted information', 'Planner: propose a policy-grounded next action', 'Reviewer: check the proposed plan', 'Structured validation also checks the outputs'], cues: [
    'The facts stage extracts submitted information. The planner proposes a next action with policy references. A separately prompted reviewer checks that proposal.',
    'These are distinct stages using Gemini, not independent people. Structured validation adds another check before an action can become available.'
  ] },
  { id: 'roles', kind: 'recording', start: 42.04, recordedDuration: 19, title: '2 / INSPECT THE PROCESSING ATTEMPTS', cues: [
    'We now run the analysis. The interface records each processing attempt, its outcome, and its duration, so the operator can inspect what happened.',
    'The displayed timings describe this example; they are not a service guarantee. All three stages finish successfully in this recording.'
  ] },
  { id: 'decision', kind: 'recording', start: 65.04, recordedDuration: 17, title: '3 / REVIEW THE PLAN AND DRAFT', cues: [
    'The plan identifies the missing receipt and asks for evidence. It does not approve reimbursement. The operator can inspect the explanation and policy references.',
    'A draft is available to copy and edit. Copying sends no message and makes no payment.'
  ] },
  { id: 'control', kind: 'card', title: 'An AI plan is not permission', eyebrow: 'HUMAN CONTROL', subtitle: 'Review the current plan. Explicitly confirm the eligible action.', body: ['A copied draft is not automatically sent', 'Confirmation is required before saving a case', 'Version checks reject a stale plan', 'No reimbursement approval or payment execution'], cues: [
    'An AI proposal alone cannot save a case. The operator must review the current plan and explicitly confirm an eligible action.',
    'Version checks protect against confirming an outdated plan. This boundary is important: saving a handling record is different from approving or paying an expense.'
  ] },
  { id: 'consent', kind: 'recording', start: 86.04, recordedDuration: 13, title: '4 / CONFIRM AND SAVE ONE SYNTHETIC CASE', cues: [
    'We prepare confirmation, review the plan, and check consent. The server saves one synthetic case.',
    'The case contains the expense facts and plan. The receipt is still missing.'
  ] },
  { id: 'readback', kind: 'recording', start: 103.04, recordedDuration: 14.96, title: '5 / RETRIEVE THE CASE INDEPENDENTLY', cues: [
    'Next, we independently retrieve the saved case through an authenticated server API request.',
    'The readback and same-visitor history show matching case details. This verifies the example, using synthetic data.'
  ] },
  { id: 'limits', kind: 'card', title: 'A focused prototype, clear limits', eyebrow: 'WHAT THIS DEMONSTRATION ESTABLISHES', subtitle: 'Recorded UI evidence with offline explanatory narration.', body: ['Synthetic policy and expense data', 'No receipt-image extraction or automatic sending', 'Model requests can fail or take time', 'A person remains responsible for the handling decision'], cues: [
    'This is a focused prototype, not a universal finance decision engine. It uses synthetic policy data and does not extract receipt images.',
    'Model requests can fail or take time. People should inspect the evidence and proposed action. These explanations do not claim guaranteed accuracy or turnaround.'
  ] },
  { id: 'outro', kind: 'card', title: 'Explore OpsCrew', eyebrow: 'PUBLIC PROTOTYPE AND SOURCE', subtitle: 'Google AI assistance with an explicit human checkpoint.', body: ['Cloud prototype', 'opscrew-883881551915.us-central1.run.app', '', 'Public repository', 'github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew'], cues: [
    'OpsCrew combines structured AI assistance, explicit confirmation, and saved-case verification in one workflow.',
    'You can explore the deployed Google Cloud prototype and public source using the links shown here. Thank you for watching.'
  ] }
];

function validate() {
  actualSourceHash = hash(source);
  if (!allowedSourceHashes.includes(actualSourceHash)) throw new Error('Source not in the two reviewed recording variants.');
  fs.mkdirSync(work, { recursive: true });
  fs.mkdirSync(evidence, { recursive: true });
  const marker = path.join(work, 'OWNER.json');
  const purpose = 'OpsCrew offline 3-to-4-minute submission demo 2026-10-16';
  if (fs.existsSync(marker) && JSON.parse(fs.readFileSync(marker, 'utf8')).purpose !== purpose) throw new Error('Unexpected workspace owner.');
  fs.writeFileSync(marker, JSON.stringify({ purpose, source_sha256: actualSourceHash }, null, 2));
}

function narration() {
  let counter = 0;
  for (const segment of timeline) segment.audio = segment.cues.map(text => ({ text, file: `voice-${String(counter++).padStart(2, '0')}.wav` }));
  const xml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const jobs = timeline.flatMap(s => s.audio.map(c => ({ text: c.text, ssml: `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><p>${xml(c.text)}</p></speak>`, path: path.join(work, c.file.replace('.wav', '-raw.wav')) })));
  if (!process.argv.includes('--reuse-audio')) {
    const jobsPath = path.join(work, 'voice-jobs.json');
    fs.writeFileSync(jobsPath, JSON.stringify(jobs));
    const ps = `$ProgressPreference='SilentlyContinue'\nAdd-Type -AssemblyName System.Speech\n$speech=[System.Speech.Synthesis.SpeechSynthesizer]::new()\n$speech.SelectVoice('Microsoft Zira Desktop')\n$speech.Rate=0\n$speech.Volume=100\n$jobs=Get-Content -LiteralPath '${jobsPath.replaceAll("'", "''")}' -Raw -Encoding UTF8 | ConvertFrom-Json\nforeach($job in $jobs){$speech.SetOutputToWaveFile($job.path);$speech.SpeakSsml($job.ssml);$speech.SetOutputToNull()}\n$speech.Dispose()\nWrite-Output 'OFFLINE_TTS_COMPLETE'`;
    const psPath = path.join(work, 'voice-synthesis.ps1');
    fs.writeFileSync(psPath, ps);
    run('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', psPath]);
    for (const segment of timeline) for (const cue of segment.audio) run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(work, cue.file.replace('.wav', '-raw.wav')), '-af', 'silenceremove=start_periods=1:start_duration=0.04:start_threshold=-55dB:start_silence=0.06,areverse,silenceremove=start_periods=1:start_duration=0.04:start_threshold=-55dB:start_silence=0.10,areverse', path.join(work, cue.file)]);
    fs.writeFileSync(path.join(work, 'NARRATION.json'), JSON.stringify({ rate: 0, cues: timeline.map(s => s.cues) }));
  } else {
    const previous = JSON.parse(fs.readFileSync(path.join(work, 'NARRATION.json'), 'utf8'));
    if (previous.rate !== 0 || JSON.stringify(previous.cues) !== JSON.stringify(timeline.map(s => s.cues))) throw new Error('Narration cache differs.');
  }
  for (const segment of timeline) {
    let cursor = 0.20;
    for (const cue of segment.audio) {
      cue.duration = Number(probe(path.join(work, cue.file)).format.duration);
      cue.start = cursor;
      cue.end = cursor + cue.duration;
      cursor = cue.end + 0.40;
    }
    const voiceEnd = segment.audio.at(-1).end;
    const min = voiceEnd + 0.20;
    if (segment.kind === 'recording') {
      segment.duration = segment.recordedDuration;
      if (min > segment.duration) throw new Error(`Narration exceeds original UI duration: ${segment.id}, ${min} > ${segment.duration}. Shorten words, never alter speech speed.`);
      const spare = segment.duration - min;
      for (const cue of segment.audio) { cue.start += spare / 2; cue.end += spare / 2; }
    } else segment.duration = Math.ceil(min * fps) / fps;
    console.log(JSON.stringify({ stage: 'voice_measured', id: segment.id, voice_seconds: segment.audio.reduce((n, c) => n + c.duration, 0), visual_seconds: segment.duration, words: segment.cues.join(' ').split(/\s+/).length }));
  }
  let previousEnd;
  let offset = 0;
  const gaps = [];
  for (const segment of timeline) {
    segment.outputStart = offset;
    segment.outputEnd = offset + segment.duration;
    for (const cue of segment.audio) {
      if (previousEnd !== undefined) gaps.push(offset + cue.start - previousEnd);
      previousEnd = offset + cue.end;
    }
    offset += segment.duration;
  }
  const words = timeline.flatMap(s => s.cues).join(' ').split(/\s+/).length;
  const voiceSeconds = timeline.reduce((n, s) => n + s.audio.reduce((t, c) => t + c.duration, 0), 0);
  const plan = { timeline, total_seconds: offset, words, voice_seconds: voiceSeconds, speaking_words_per_minute: words / voiceSeconds * 60, inter_cue_gaps: gaps };
  fs.writeFileSync(path.join(work, 'PLAN.json'), JSON.stringify(plan, null, 2));
  console.log(JSON.stringify({ stage: 'narration_plan', ...Object.fromEntries(Object.entries(plan).filter(([k]) => k !== 'timeline')), maximum_gap: Math.max(...gaps) }));
  if (Math.max(...gaps) > 1.20) throw new Error('Narration interval exceeds 1.2 seconds. Revise words to suit footage.');
  if (!(offset > 180 && offset < 240)) throw new Error('Plan must be strictly between 180 and 240 seconds.');
}

function wrap(text, length = 61) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && line.length + word.length + 1 > length) { lines.push(line); line = word; }
    else line += (line ? ' ' : '') + word;
  }
  if (line) lines.push(line);
  if (lines.length > 3) throw new Error('Caption exceeds three lines: ' + text);
  return lines.join('\n');
}
function textFile(name, value) { fs.writeFileSync(path.join(work, name + '.txt'), value); return name + '.txt'; }
function drawText(file, size, x, y, extra = '', weight = 'normal') {
  const lines = fs.readFileSync(path.join(work, file), 'utf8').split(/\r?\n/);
  return lines.flatMap((line, i) => {
    if (!line) return [];
    const lineFile = file.replace(/\.txt$/, `-line-${i}.txt`);
    fs.writeFileSync(path.join(work, lineFile), line);
    const lineY = y === 'caption-centered' ? `930+(84-${lines.length * (size + 7) - 7})/2+${i * (size + 7)}` : `(${y})+${i * (size + 7)}`;
    return [`drawtext=fontfile='${weight === 'bold' ? bold : font}':textfile='${lineFile}':fontcolor=white:fontsize=${size}:x=${x}:y=${lineY}${extra}`];
  }).join(',');
}

function assets() {
  for (const s of timeline) {
    textFile(s.id + '-title', s.title);
    if (s.kind === 'card') {
      textFile(s.id + '-eyebrow', s.eyebrow);
      textFile(s.id + '-subtitle', s.subtitle);
      textFile(s.id + '-body', s.body.join('\n\n'));
    }
    for (let i = 0; i < s.audio.length; i++) textFile(`${s.id}-caption-${i}`, wrap(s.audio[i].text));
  }
  textFile('recorded-label', 'RECORDED WALKTHROUGH - 15 OCT 2026 - SYNTHETIC DATA');
  textFile('explanation-label', 'EXPLANATION - RECORDED UI AND EXPLANATORY CARDS');
  textFile('edit-disclosure', 'Original UI at recorded speed and sequence. Offline synthesized narration. Synthetic data.');
  textFile('tts-disclosure', 'Google model integration is in the application. This video edit makes no new model calls.');
}

function render() {
  const segments = [];
  for (let index = 0; index < timeline.length; index++) {
    const s = timeline[index];
    const args = ['-hide_banner', '-loglevel', 'error', '-y'];
    if (s.kind === 'recording') args.push('-ss', String(s.start), '-i', source);
    else args.push('-f', 'lavfi', '-i', `color=c=0x101827:s=1920x1080:r=${fps}:d=${s.duration}`);
    for (const cue of s.audio) args.push('-i', cue.file);
    let visual;
    if (s.kind === 'recording') {
      visual = `trim=duration=${s.duration},setpts=PTS-STARTPTS,drawbox=x=0:y=0:w=1920:h=42:color=0x0F172A:t=fill,${drawText('recorded-label.txt', 18, 20, 8)},drawbox=x=514:y=918:w=894:h=108:color=0x0F172A:t=fill`;
    } else {
      visual = `drawbox=x=110:y=135:w=1700:h=6:color=0x34D2BF:t=fill,${drawText(`${s.id}-eyebrow.txt`, 24, 110, 180)},${drawText(`${s.id}-title.txt`, s.id === 'intro' ? 92 : 64, 110, 240, '', 'bold')},${drawText(`${s.id}-subtitle.txt`, 34, 110, 350)},${drawText(`${s.id}-body.txt`, s.id === 'outro' ? 31 : 36, 110, 465)}`;
      visual += `,${drawText('explanation-label.txt', 18, 20, 8)},${drawText(s.id === 'outro' ? 'tts-disclosure.txt' : 'edit-disclosure.txt', 21, 110, 1040)}`;
      visual += ',drawbox=x=514:y=918:w=894:h=108:color=0x192639:t=fill';
      visual += `,drawbox=x=110:y=855:w=${Math.round(1700 * (index + 1) / timeline.length)}:h=5:color=0x34D2BF:t=fill`;
    }
    for (let i = 0; i < s.audio.length; i++) visual += `,${drawText(`${s.id}-caption-${i}.txt`, 24, '(w-text_w)/2', 'caption-centered', `:enable='between(t,${s.audio[i].start.toFixed(4)},${s.audio[i].end.toFixed(4)})'`)}`;
    const filters = [`[0:v]${visual},setsar=1,format=yuv420p[v]`];
    for (let i = 0; i < s.audio.length; i++) filters.push(`[${i + 1}:a]adelay=${Math.round(s.audio[i].start * 1000)}:all=1,apad=whole_dur=${s.duration}[a${i}]`);
    filters.push(`${s.audio.map((_, i) => `[a${i}]`).join('')}amix=inputs=${s.audio.length}:normalize=0,alimiter=limit=0.95,atrim=duration=${s.duration}[audio]`);
    const filterFile = s.id + '-filter.txt';
    fs.writeFileSync(path.join(work, filterFile), filters.join(';\n'));
    const segmentFile = s.id + '.mp4';
    args.push('-filter_complex_script', filterFile, '-map', '[v]', '-map', '[audio]', '-t', String(s.duration), '-r', String(fps), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-b:a', '160k', '-movflags', '+faststart', segmentFile);
    run('ffmpeg', args, { cwd: work, stdio: ['ignore', 'ignore', 'pipe'] });
    segments.push(segmentFile);
    console.log(JSON.stringify({ stage: 'rendered', id: s.id, duration: s.duration }));
  }
  fs.writeFileSync(path.join(work, 'concat.txt'), segments.map(s => `file '${s}'`).join('\n'));
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '1', '-i', 'concat.txt', '-c', 'copy', '-movflags', '+faststart', output], { cwd: work });
}

function deliverables() {
  const captions = timeline.flatMap(s => s.audio.map(c => ({ start: s.outputStart + c.start, end: s.outputStart + c.end, text: c.text, segment: s.id })));
  const stamp = (s, separator) => {
    const ms = Math.round(s * 1000);
    return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}${separator}${String(ms % 1000).padStart(3, '0')}`;
  };
  fs.writeFileSync(output.replace(/\.mp4$/, '.srt'), captions.map((c, i) => `${i + 1}\n${stamp(c.start, ',')} --> ${stamp(c.end, ',')}\n${c.text}\n`).join('\n'));
  fs.writeFileSync(output.replace(/\.mp4$/, '.vtt'), 'WEBVTT\n\n' + captions.map(c => `${stamp(c.start, '.')} --> ${stamp(c.end, '.')}\n${c.text}\n`).join('\n'));
  const info = probe(output);
  if (!(Number(info.format.duration) > 180 && Number(info.format.duration) < 240)) throw new Error('Output outside portal 3–4-minute duration.');
  if (hash(source) !== actualSourceHash) throw new Error('Original source changed.');
  const build = {
    date_local: '2026-10-16', timezone: 'Asia/Shanghai', status: 'BUILT_QA_PENDING',
    reason: 'Owner supplied the actual submission form screenshot requiring a 3–4-minute demonstration video; this revision supersedes the older 103.941-second video only after owner approval and new publication.',
    source: { path: path.relative(root, source).replaceAll('\\', '/'), sha256: actualSourceHash, allowed_sha256: allowedSourceHashes, original_unchanged: true },
    output: { path: 'submission/' + path.basename(output), sha256: hash(output), bytes: fs.statSync(output).size, duration_seconds: Number(info.format.duration), streams: info.streams.map(s => ({ codec_type: s.codec_type, codec_name: s.codec_name, width: s.width, height: s.height, sample_rate: s.sample_rate, channels: s.channels, nb_frames: s.nb_frames, avg_frame_rate: s.avg_frame_rate })) },
    builder: { path: 'submission/' + path.basename(fileURLToPath(import.meta.url)), sha256: hash(fileURLToPath(import.meta.url)), network_calls: 0, model_calls: 0, tts: 'Windows System.Speech, Microsoft Zira Desktop, en-US, offline, Rate=0', original_audio_included: false, time_stretch: false, recorded_ui_speed: 1, recorded_ui_sequence_preserved: true, recorded_ui_hold_seconds: 0, work_directory: '.review-media-3to4-20261016', cleanup: 'PENDING_AFTER_QA' },
    overlay_regions: { original_hud_replaced: { x: 0, y: 0, width: 1920, height: 42 }, old_burned_caption_replaced: { x: 514, y: 918, width: 894, height: 108 }, no_added_success_state_or_business_field: true },
    narration: { words: captions.map(c => c.text).join(' ').split(/\s+/).length, voice_seconds: timeline.reduce((n, s) => n + s.audio.reduce((t, c) => t + c.duration, 0), 0), rate: 0, inter_cue_gap_seconds: 0.40, boundary_silence_only_trimmed: true, no_prosody_speed_change: true },
    timeline, captions,
    limitations: ['The recorded footage is not a new live production test. Its original DOM address overlay established neither native browser origin nor source identity.', 'Explanation cards are editorial explanations, not screenshots of additional implemented product pages.', 'Complete human listening and hosted-link playback checks remain required.', 'The old hosted video is not updated by creating a local replacement.']
  };
  fs.writeFileSync(path.join(evidence, 'VIDEO-3to4-build-2026-10-16.json'), JSON.stringify(build, null, 2) + '\n');
  console.log(JSON.stringify({ stage: 'built', output, duration_seconds: build.output.duration_seconds, sha256: build.output.sha256, words: build.narration.words }));
}

validate();
narration();
if (process.argv.includes('--narration-only')) process.exit(0);
assets();
render();
deliverables();
