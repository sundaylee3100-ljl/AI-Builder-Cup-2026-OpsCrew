#!/usr/bin/env python3
"""
Render Part 1 slides for OpsCrew Combined Official Demo Video.
Extracts slides from the proposal PDF (or uses cached slides), scales them with reserved
title-safe band at bottom, burns styled subtitles, generates speech with Samantha (macOS say),
and outputs a synchronized 48.0s MP4 (1920x1080 @ 25fps).
"""

import os
import sys
import subprocess
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(BASE_DIR, 'submission/video_output')
BUILD_DIR = os.path.join(OUTPUT_DIR, 'build')
SLIDES_DIR = '/tmp/cloud_slides'
PDF_PATH = os.path.join(BASE_DIR, 'submission/OpsCrew_Proposal_Cloud_cloud-public-links-review-2026-10-14.pdf')

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(BUILD_DIR, exist_ok=True)
os.makedirs(SLIDES_DIR, exist_ok=True)

# Ensure slides exist from PDF
if not os.path.exists(os.path.join(SLIDES_DIR, 'slide-07.png')) or os.path.getmtime(PDF_PATH) > os.path.getmtime(os.path.join(SLIDES_DIR, 'slide-07.png')):
    print(f"[Slides] Extracting slides from {PDF_PATH} via pdftoppm...")
    subprocess.run(['pdftoppm', '-png', '-r', '150', PDF_PATH, os.path.join(SLIDES_DIR, 'slide')], check=True)

slides_config = [
    {
        'id': 'slide_01',
        'src': os.path.join(SLIDES_DIR, 'slide-01.png'),
        'duration': 9.5,
        'audio_delay': 0.4,
        'narration': 'Welcome to OpsCrew, an autonomous multi-agent copilot built from zero in Google AI Studio Build for the AI Builder Cup 2026.',
        'sub': 'Welcome to OpsCrew, an autonomous multi-agent copilot\nbuilt in Google AI Studio Build for the AI Builder Cup 2026.'
    },
    {
        'id': 'slide_02',
        'src': os.path.join(SLIDES_DIR, 'slide-07.png'),
        'duration': 10.5,
        'audio_delay': 0.4,
        'speech_rate': '180',
        'narration': 'Deployed on Google Cloud Run with dual-mode Vertex AI and Gemini API, three agents handle facts, planning, and review. Let us examine OpsCrew live in production.',
        'sub': 'Deployed on Google Cloud Run with dual-mode Vertex AI & Gemini API, Firestore, and Secret Manager.\nNow, let us examine OpsCrew operating live in production.'
    }
]

font_candidates = [
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    '/System/Library/Fonts/Supplemental/Arial.ttf',
    '/Library/Fonts/Arial.ttf'
]
font_path = font_candidates[0]
for fc in font_candidates:
    if os.path.exists(fc):
        font_path = fc
        break

font = ImageFont.truetype(font_path, 28)
slide_clips = []

for idx, s in enumerate(slides_config):
    print(f"[Slide {idx+1}/{len(slides_config)}] Processing {s['id']}...")
    base_img = Image.open(s['src']).convert('RGBA')
    target_w, target_h = 1920, 1080
    content_h = 900  # Reserve top 900px for slide content, 180px for subtitle band

    img_w, img_h = base_img.size
    scale = min(target_w / img_w, content_h / img_h)
    new_w = int(img_w * scale)
    new_h = int(img_h * scale)
    resized = base_img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas = Image.new('RGBA', (target_w, target_h), (15, 23, 42, 255))
    offset_x = (target_w - new_w) // 2
    offset_y = 15
    canvas.paste(resized, (offset_x, offset_y))

    draw = ImageDraw.Draw(canvas)
    bbox = draw.multiline_textbbox((0, 0), s['sub'], font=font, align='center', spacing=8)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    pad_x = 36
    pad_y = 14
    pill_w = text_w + pad_x * 2
    pill_h = text_h + pad_y * 2

    pill_x = (target_w - pill_w) // 2
    pill_y = target_h - pill_h - 60  # 60px above bottom edge: safe title area

    overlay = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    # Soft drop shadow
    overlay_draw.rounded_rectangle(
        [pill_x + 2, pill_y + 4, pill_x + pill_w + 2, pill_y + pill_h + 4],
        radius=16,
        fill=(0, 0, 0, 160)
    )

    # High-contrast rounded pill container
    overlay_draw.rounded_rectangle(
        [pill_x, pill_y, pill_x + pill_w, pill_y + pill_h],
        radius=16,
        fill=(15, 23, 42, 235),
        outline=(56, 189, 248, 200),
        width=2
    )

    canvas = Image.alpha_composite(canvas, overlay)

    draw_final = ImageDraw.Draw(canvas)
    text_x = pill_x + pad_x - bbox[0]
    text_y = pill_y + pad_y - bbox[1]
    draw_final.multiline_text((text_x, text_y), s['sub'], font=font, align='center', spacing=8, fill=(255, 255, 255, 255))

    frame_path = os.path.join(BUILD_DIR, f"{s['id']}_frame.png")
    canvas.convert('RGB').save(frame_path, quality=95)

    # Generate speech
    aiff_path = os.path.join(BUILD_DIR, f"{s['id']}.aiff")
    wav_raw = os.path.join(BUILD_DIR, f"{s['id']}_raw.wav")
    wav_padded = os.path.join(BUILD_DIR, f"{s['id']}.wav")

    speech_rate = s.get('speech_rate', '170')
    subprocess.run(['say', '-v', 'Samantha', '-r', speech_rate, s['narration'], '-o', aiff_path], check=True)
    subprocess.run(['ffmpeg', '-y', '-i', aiff_path, '-ar', '48000', '-ac', '2', wav_raw], capture_output=True, check=True)

    # Pad audio to exact slide duration with initial delay
    delay_ms = int(s['audio_delay'] * 1000)
    filter_complex = f"[0:a]adelay={delay_ms}|{delay_ms},apad=whole_dur={s['duration']:.2f},highpass=f=80[aout]"
    subprocess.run([
        'ffmpeg', '-y', '-i', wav_raw,
        '-filter_complex', filter_complex,
        '-map', '[aout]',
        '-t', f"{s['duration']:.2f}",
        '-ar', '48000', '-ac', '2',
        wav_padded
    ], capture_output=True, check=True)

    # Render video clip
    clip_mp4 = os.path.join(BUILD_DIR, f"{s['id']}.mp4")
    subprocess.run([
        'ffmpeg', '-y',
        '-loop', '1', '-i', frame_path,
        '-i', wav_padded,
        '-c:v', 'libx264', '-t', f"{s['duration']:.2f}",
        '-pix_fmt', 'yuv420p', '-r', '25',
        '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
        '-shortest',
        clip_mp4
    ], capture_output=True, check=True)
    slide_clips.append(clip_mp4)

# Concat all clips into part1_slides.mp4
concat_list = os.path.join(BUILD_DIR, 'part1_concat.txt')
with open(concat_list, 'w') as f:
    for c in slide_clips:
        f.write(f"file '{os.path.abspath(c)}'\n")

part1_mp4 = os.path.join(OUTPUT_DIR, 'part1_slides.mp4')
subprocess.run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_list, '-c', 'copy', part1_mp4], capture_output=True, check=True)

dur = subprocess.run([
    'ffprobe', '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    part1_mp4
], capture_output=True, text=True, check=True).stdout.strip()

print(f"=== Part 1 Generated Successfully: {part1_mp4} (Duration: {float(dur):.2f}s) ===")
