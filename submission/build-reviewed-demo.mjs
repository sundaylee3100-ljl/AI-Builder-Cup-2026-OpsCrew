/** Offline, factual edit of the owner's recorded demonstration. No network or model calls. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const submission = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(submission);
const cliSource = process.argv.find(a => a.startsWith('--input='))?.slice('--input='.length);
const ownerSource = path.join(submission, 'Final-video.mp4');
const gitSource = path.join(submission, 'Original_Recorded_Demo_2026-10-16.mp4');
const source = cliSource ? path.resolve(cliSource) : (fs.existsSync(ownerSource) ? ownerSource : gitSource);
const output = path.join(submission, 'OpsCrew_Submission_Demo_2026-10-16.mp4');
const work = path.join(root, '.review-media-20261016');
const evidence = path.join(root, 'docs', 'acceptance');
const allowedSourceHashes = ['79b6bbef75b76ce236de25a4364fe911697c6c28acfc4f12681bd79441c90c43', 'cb64b670e057709cdcb85aa55dde7e2f05fbc3eb3490042cd13eacd4c36a6772'];
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run = (exe, args, options = {}) => execFileSync(exe, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, ...options });
const probe = p => JSON.parse(run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', p]));
const filterPath = p => p.replaceAll('\\', '/').replaceAll(':', '\\:').replaceAll("'", "\\'");
const font = filterPath('C:/Windows/Fonts/segoeui.ttf');
const bold = filterPath('C:/Windows/Fonts/segoeuib.ttf');
const fps = 25;
let actualSourceHash;

const timeline = [
  { id: 'intro', kind: 'card', duration: 14, title: 'OpsCrew', subtitle: 'Expense exception plans with human confirmation', cues: [
    'OpsCrew helps finance teams prepare expense exception plans, while people keep control of every saved case.',
    'Built in Google AI Studio Build, it uses Gemini and runs on Google Cloud Run.'
  ] },
  { id: 'intake', kind: 'recording', start: 24.04, duration: 14, title: '1. Visitor session and synthetic input', cues: [
    'Start a visitor session, then enter a synthetic thirty-eight dollar parking expense with a missing receipt.',
    'The inputs are text and form fields. No receipt image is uploaded or read.'
  ] },
  { id: 'roles', kind: 'recording', start: 42.04, duration: 19, title: '2. Facts, planning and independent review', cues: [
    'Gemini performs three distinct roles: fact extraction, planning, and independent review.',
    'The interface shows completed attempts and their measured durations. This recorded run passes review; it is not a service-level guarantee.'
  ] },
  { id: 'decision', kind: 'recording', start: 65.04, duration: 17, title: '3. Evidence request and copy-only draft', cues: [
    'The synthetic missing-receipt rule leads to an evidence request, not reimbursement approval.',
    'The operator can copy a communication draft. Copying sends no message and executes no payment.'
  ] },
  { id: 'consent', kind: 'recording', start: 86.04, duration: 13, title: '4. Explicit human confirmation', cues: [
    'Prepare the current confirmation, inspect the facts and plan, then explicitly check consent.',
    'Confirming creates one synthetic exception record. It does not authorize reimbursement or payment.'
  ] },
  { id: 'readback', kind: 'recording', start: 103.04, duration: 14.96, title: '5. Independent readback and same-visitor history', cues: [
    'The browser requests the saved record through the authenticated server API.',
    "Independent readback and the same visitor's history show matching case details. This verifies this example, not universal data integrity."
  ] },
  { id: 'outro', kind: 'card', duration: 12, title: 'Human control. Verifiable saved cases.', subtitle: 'Explore OpsCrew', cues: [
    'OpsCrew combines policy-grounded AI assistance, explicit human confirmation, and verifiable saved-case results.',
    'Explore the public source and cloud prototype. All demonstrated data is synthetic.'
  ] }
];

function stage1_validateSource() {
  actualSourceHash = hash(source);
  if (!allowedSourceHashes.includes(actualSourceHash)) throw new Error('Input changed: review the new source before rebuilding.');
  if (process.argv.includes('--check-input-only')) {
    console.log(JSON.stringify({ input: path.relative(root, source), sha256: actualSourceHash, accepted: true, source_variants_are_not_byte_identical: true }));
    process.exit(0);
  }
  if (!fs.existsSync(work)) fs.mkdirSync(work);
  fs.mkdirSync(evidence, { recursive: true });
  const marker = path.join(work, 'OWNER.json');
  if (fs.existsSync(marker)) {
    const previous = JSON.parse(fs.readFileSync(marker, 'utf8'));
    if (previous.purpose !== 'OpsCrew offline reviewed demo 2026-10-16') throw new Error('Unexpected work directory owner.');
  }
  fs.writeFileSync(marker, JSON.stringify({ purpose: 'OpsCrew offline reviewed demo 2026-10-16', source_sha256: actualSourceHash }, null, 2));
}

function stage2_offlineNarration() {
  let counter = 0;
  for (const segment of timeline) segment.audio = segment.cues.map(text => ({ text, file: `voice-${String(counter++).padStart(2, '0')}.wav` }));
  if (process.argv.includes('--reuse-audio')) {
    const previous = JSON.parse(fs.readFileSync(path.join(evidence, 'FINAL-video-corrected-build-2026-10-16.json'), 'utf8'));
    if (JSON.stringify(previous.timeline.map(s => s.cues)) !== JSON.stringify(timeline.map(s => s.cues))) throw new Error('Narration changed; cannot reuse audio.');
    for (const segment of timeline) {
      let cursor = 0.35;
      for (const cue of segment.audio) {
        cue.duration = Number(probe(path.join(work, cue.file)).format.duration);
        cue.start = cursor; cue.end = cursor + cue.duration; cursor = cue.end + 0.28;
      }
      segment.voiceRate = previous.timeline.find(s => s.id === segment.id).voiceRate;
      if (cursor > segment.duration - 0.2) throw new Error('Existing narration does not fit.');
    }
    return;
  }
  for (let rate = 0; rate <= 4; rate++) {
    const jobs = timeline.flatMap(s => s.audio.map(c => ({ text: c.text, path: path.join(work, c.file) })));
    const jobs64 = Buffer.from(JSON.stringify(jobs), 'utf8').toString('base64');
    const ps = `Add-Type -AssemblyName System.Speech\n$speech=[System.Speech.Synthesis.SpeechSynthesizer]::new()\n$speech.SelectVoice('Microsoft Zira Desktop')\n$speech.Rate=${rate}\n$speech.Volume=100\n$jobs=ConvertFrom-Json ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${jobs64}')))\nforeach($job in $jobs){$speech.SetOutputToWaveFile($job.path);$speech.Speak($job.text);$speech.SetOutputToNull()}\n$speech.Dispose()\nWrite-Output 'OFFLINE_TTS_COMPLETE'`;
    run('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(ps, 'utf16le').toString('base64')]);
    let fits = true;
    for (const segment of timeline) {
      let cursor = 0.35;
      for (const cue of segment.audio) {
        cue.duration = Number(probe(path.join(work, cue.file)).format.duration);
        cue.start = cursor;
        cue.end = cursor + cue.duration;
        cursor = cue.end + 0.28;
      }
      segment.voiceRate = rate;
      if (cursor > segment.duration - 0.2) fits = false;
    }
    if (fits) return;
  }
  throw new Error('Narration cannot fit the original recorded action intervals without excessive speed.');
}

function stage3_textAssets() {
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
  for (const segment of timeline) {
    fs.writeFileSync(path.join(work, `${segment.id}-title.txt`), segment.title);
    for (let i = 0; i < segment.audio.length; i++) fs.writeFileSync(path.join(work, `${segment.id}-caption-${i}.txt`), wrap(segment.audio[i].text));
  }
  const texts = {
    'intro-body': 'AI suggests. A person authorizes record creation.\n\nSynthetic demonstration policy and expense data.\n\nGoogle AI Studio Build  /  Gemini  /  Cloud Run',
    'outro-body': 'Public source\ngithub.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew\n\nCloud prototype\nhttps://opscrew-883881551915.us-central1.run.app\n\nNo automatic reimbursement or payment.',
    'intro-subtitle': timeline[0].subtitle,
    'outro-subtitle': timeline.at(-1).subtitle,
    'recorded-label': 'RECORDED WALKTHROUGH - 15 OCT 2026 - SYNTHETIC DATA',
    'edit-disclosure': 'Edited for clarity: original UI at recorded speed; new factual narration and captions.',
    'tts-disclosure': 'English narration: offline speech synthesis. No new model calls for this edit.'
  };
  for (const [name, value] of Object.entries(texts)) fs.writeFileSync(path.join(work, `${name}.txt`), value);
}

function drawText(file, size, x, y, extra = '') {
  const lines = fs.readFileSync(path.join(work, file), 'utf8').split(/\r?\n/);
  return lines.flatMap((line, i) => {
    if (!line) return [];
    const lineFile = file.replace(/\.txt$/, `-line-${i}.txt`);
    fs.writeFileSync(path.join(work, lineFile), line);
    const lineY = y === 'caption-centered' ? `930+(84-${lines.length * (size + 7) - 7})/2+${i * (size + 7)}` : `(${y})+${i * (size + 7)}`;
    return [`drawtext=fontfile='${font}':textfile='${lineFile}':fontcolor=white:fontsize=${size}:x=${x}:y=${lineY}${extra}`];
  }).join(',');
}

function stage4_renderSegments() {
  const segments = [];
  for (const segment of timeline) {
    const args = ['-hide_banner', '-loglevel', 'error', '-y'];
    if (segment.kind === 'recording') args.push('-ss', String(segment.start), '-i', source);
    else args.push('-f', 'lavfi', '-i', `color=c=0x101827:s=1920x1080:r=${fps}:d=${segment.duration}`);
    for (const cue of segment.audio) args.push('-i', cue.file);
    const filters = [];
    let visual = '';
    if (segment.kind === 'recording') {
      visual = `drawbox=x=0:y=0:w=1920:h=42:color=0x0F172A:t=fill,${drawText('recorded-label.txt', 18, 20, 8)},drawbox=x=514:y=918:w=894:h=108:color=0x0F172A:t=fill`;
    } else {
      visual = `drawbox=x=110:y=135:w=1700:h=6:color=0x34D2BF:t=fill,drawtext=fontfile='${bold}':textfile='${segment.id}-title.txt':fontcolor=white:fontsize=${segment.id === 'intro' ? 95 : 67}:x=110:y=215,${drawText(`${segment.id}-subtitle.txt`, 40, 110, 335)},${drawText(`${segment.id}-body.txt`, segment.id === 'intro' ? 37 : 31, 110, 440)}`;
      visual += `,${drawText(segment.id === 'intro' ? 'edit-disclosure.txt' : 'tts-disclosure.txt', 22, 110, 1040)}`;
      visual += ',drawbox=x=514:y=918:w=894:h=108:color=0x192639:t=fill';
    }
    for (let i = 0; i < segment.audio.length; i++) {
      const cue = segment.audio[i];
      visual += `,${drawText(`${segment.id}-caption-${i}.txt`, 24, '(w-text_w)/2', 'caption-centered', `:enable='between(t,${cue.start.toFixed(4)},${cue.end.toFixed(4)})'`)}`;
    }
    filters.push(`[0:v]${visual},setsar=1,format=yuv420p[v]`);
    for (let i = 0; i < segment.audio.length; i++) {
      const delay = Math.round(segment.audio[i].start * 1000);
      filters.push(`[${i + 1}:a]adelay=${delay}:all=1,apad=whole_dur=${segment.duration}[a${i}]`);
    }
    filters.push(`${segment.audio.map((_, i) => `[a${i}]`).join('')}amix=inputs=${segment.audio.length}:normalize=0,alimiter=limit=0.95,atrim=duration=${segment.duration}[audio]`);
    const filterFile = `${segment.id}-filter.txt`;
    fs.writeFileSync(path.join(work, filterFile), filters.join(';\n'));
    const segmentFile = `${segment.id}.mp4`;
    args.push('-filter_complex_script', filterFile, '-map', '[v]', '-map', '[audio]', '-t', String(segment.duration), '-r', String(fps), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-b:a', '160k', '-movflags', '+faststart', segmentFile);
    run('ffmpeg', args, { cwd: work, stdio: ['ignore', 'ignore', 'pipe'] });
    segments.push(segmentFile);
    console.log(JSON.stringify({ stage: 'rendered', segment: segment.id, duration: segment.duration }));
  }
  fs.writeFileSync(path.join(work, 'concat.txt'), segments.map(s => `file '${s}'`).join('\n'));
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '1', '-i', 'concat.txt', '-c', 'copy', '-movflags', '+faststart', output], { cwd: work });
}

function stage5_captionsAndBuildEvidence() {
  const captions = [];
  let offset = 0;
  for (const segment of timeline) {
    segment.outputStart = offset;
    segment.outputEnd = offset + segment.duration;
    for (const cue of segment.audio) captions.push({ start: offset + cue.start, end: offset + cue.end, text: cue.text });
    offset += segment.duration;
  }
  const stamp = (s, separator) => {
    const ms = Math.round(s * 1000);
    return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}${separator}${String(ms % 1000).padStart(3, '0')}`;
  };
  fs.writeFileSync(output.replace(/\.mp4$/, '.srt'), captions.map((c, i) => `${i + 1}\n${stamp(c.start, ',')} --> ${stamp(c.end, ',')}\n${c.text}\n`).join('\n'));
  fs.writeFileSync(output.replace(/\.mp4$/, '.vtt'), 'WEBVTT\n\n' + captions.map(c => `${stamp(c.start, '.')} --> ${stamp(c.end, '.')}\n${c.text}\n`).join('\n'));
  const info = probe(output);
  if (Number(info.format.duration) >= 180) throw new Error('Output violates the strict sub-180-second limit.');
  if (hash(source) !== actualSourceHash) throw new Error('Original source was modified.');
  const build = {
    date_local: '2026-10-16', timezone: 'Asia/Shanghai', status: 'BUILT_QA_PENDING', source: { path: path.relative(root, source).replaceAll('\\', '/'), sha256: actualSourceHash, allowed_source_sha256_variants: allowedSourceHashes, variants_are_byte_identical: false, unchanged: true },
    output: { path: 'submission/' + path.basename(output), sha256: hash(output), bytes: fs.statSync(output).size, duration_seconds: Number(info.format.duration), streams: info.streams.map(s => ({ codec_type: s.codec_type, codec_name: s.codec_name, width: s.width, height: s.height, sample_rate: s.sample_rate, channels: s.channels, nb_frames: s.nb_frames })) },
    builder: { path: 'submission/build-reviewed-demo.mjs', sha256: hash(fileURLToPath(import.meta.url)), network_calls: 0, model_calls: 0, tts: 'Windows System.Speech, Microsoft Zira Desktop, en-US, offline', original_audio_included: false, original_intro_chapter_cards_outro_included: false, recorded_ui_speed: 1, work_directory: '.review-media-20261016', cleanup: 'PENDING_AFTER_QA' },
    overlay_regions: { old_hud_replaced: { x: 0, y: 0, width: 1920, height: 42 }, existing_burned_caption_area_replaced: { x: 514, y: 918, width: 894, height: 108 }, no_added_success_state_or_field_values: true },
    timeline, captions, narration_words: captions.map(c => c.text).join(' ').split(/\s+/).length,
    limitations: ['The supplied original footage is recorded evidence, not a new live production test. Its apparent address bar was a DOM overlay, not native browser chrome; the overlay establishes neither network origin nor source identity.', 'The complete new audio requires a human listening pass; technical decoding alone is insufficient.', 'The hosted old video is not updated by this local edit. A public approved replacement URL is still required.']
  };
  fs.writeFileSync(path.join(evidence, 'FINAL-video-corrected-build-2026-10-16.json'), JSON.stringify(build, null, 2) + '\n');
  console.log(JSON.stringify({ stage: 'built', output, duration_seconds: Number(info.format.duration), sha256: build.output.sha256, narration_words: build.narration_words, offline_voice_rate: timeline[0].voiceRate }));
}

stage1_validateSource();
stage2_offlineNarration();
stage3_textAssets();
stage4_renderSegments();
stage5_captionsAndBuildEvidence();
