#!/usr/bin/env python3
"""
Build the four "Already Here" meditation MP3s (5/10/15/20 min) from the
15 ElevenLabs renders + the closing bell.

Renders (numbered in script order):
  01..06  base paragraphs P1..P6
  07..09  Section A — body settling   (slot between P2 and P3)
  10..12  Section B — breath cycles   (slot between P3 and P4)
  13..15  Section C — pointing        (slot between P4 and P5)

Each output is a single MP3 of:
  [1.0s lead silence] clip [silence] clip [silence] ... clip [silence] [bell]

96 kbps mono — same encoding profile as the rest of the catalog.
"""

import subprocess
from pathlib import Path

CLIPS_DIR = Path('/Users/jbrumm/meditation-app/audio-build/clips')
OUTPUT_DIR = Path('/Users/jbrumm/meditation-app/audio-build/output')
BELL = Path('/Users/jbrumm/Downloads/bell.wav')
FFMPEG = '/opt/homebrew/bin/ffmpeg'

# Clip filenames keyed by their script position. All these files exist in CLIPS_DIR.
P1, P2, P3, P4, P5, P6 = [f'{i:02d}.mp3' for i in range(1, 7)]
A1, A2, A3 = '07.mp3', '08.mp3', '09.mp3'
B1, B2, B3 = '10.mp3', '11.mp3', '12.mp3'
C1, C2, C3 = '13.mp3', '14.mp3', '15.mp3'

LEAD_SILENCE = 1.0  # seconds before the first paragraph

# Each meditation is a list of (clip_filename, silence_after_in_seconds).
# The lead silence is added separately. The bell follows the final silence.
MEDITATIONS = {
    'already-here-5min.mp3': [
        (P1, 25), (P2, 35), (P3, 45), (P4, 55), (P5, 45), (P6, 25),
    ],
    # 10-min: insert Section B (breath cycles) between P3 and P4.
    'already-here-10min.mp3': [
        (P1, 30), (P2, 45),
        (P3, 50),
        (B1, 35), (B2, 90), (B3, 80),
        (P4, 65), (P5, 60), (P6, 50),
    ],
    # 15-min: insert Sections A + B between P2/P3 and P3/P4 respectively.
    'already-here-15min.mp3': [
        (P1, 35), (P2, 50),
        (A1, 60), (A2, 90), (A3, 60),
        (P3, 55),
        (B1, 35), (B2, 90), (B3, 90),
        (P4, 75), (P5, 75), (P6, 55),
    ],
    # 20-min: insert all three sections (A, B, C).
    'already-here-20min.mp3': [
        (P1, 35), (P2, 50),
        (A1, 60), (A2, 90), (A3, 60),
        (P3, 55),
        (B1, 40), (B2, 95), (B3, 90),
        (P4, 65),
        (C1, 85), (C2, 95), (C3, 75),
        (P5, 80), (P6, 60),
    ],
}


def probe_duration(path: Path) -> float:
    """Return the duration of an audio file in seconds."""
    out = subprocess.check_output([
        '/opt/homebrew/bin/ffprobe', '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'csv=p=0', str(path),
    ]).decode().strip()
    return float(out)


def build(out_name: str, sequence: list[tuple[str, float]]) -> None:
    """
    Build a single meditation MP3.

    Pipeline:
      1. Generate silence segments inline via ffmpeg's anullsrc.
      2. Concat: [lead silence] [clip0] [silence0] [clip1] [silence1] ... [bell]
      3. Encode to 96 kbps mono MP3.
    """
    inputs: list[str] = []
    # ffmpeg input list — every clip + the bell, in order. Indices line up
    # with [N:a] labels in the filter graph below.
    for clip_name, _ in sequence:
        inputs.extend(['-i', str(CLIPS_DIR / clip_name)])
    inputs.extend(['-i', str(BELL)])
    bell_idx = len(sequence)  # index of the bell in the input list

    # Build the filter graph. Each silence segment is its own anullsrc with
    # a unique label [si]; concat consumes everything in order.
    filter_parts: list[str] = []
    concat_inputs: list[str] = []

    # Leading silence
    filter_parts.append(
        f'anullsrc=cl=mono:r=44100:d={LEAD_SILENCE}[lead]'
    )
    concat_inputs.append('[lead]')

    for i, (_, silence_after) in enumerate(sequence):
        # Speech clip i — feed through aformat to normalise sample rate / channels
        # so the concat filter doesn't choke on mismatched inputs.
        filter_parts.append(
            f'[{i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=mono[c{i}]'
        )
        concat_inputs.append(f'[c{i}]')
        # Silence after this clip
        filter_parts.append(
            f'anullsrc=cl=mono:r=44100:d={silence_after}[s{i}]'
        )
        concat_inputs.append(f'[s{i}]')

    # Bell at the very end (also normalised)
    filter_parts.append(
        f'[{bell_idx}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=mono[bell]'
    )
    concat_inputs.append('[bell]')

    n_segments = len(concat_inputs)
    filter_parts.append(
        ''.join(concat_inputs) + f'concat=n={n_segments}:v=0:a=1[out]'
    )

    filter_complex = ';'.join(filter_parts)

    out_path = OUTPUT_DIR / out_name
    cmd = [
        FFMPEG, '-y',
        *inputs,
        '-filter_complex', filter_complex,
        '-map', '[out]',
        '-ac', '1',
        '-ar', '44100',
        '-b:a', '96k',
        '-codec:a', 'libmp3lame',
        str(out_path),
    ]
    print(f'\n→ {out_name}')
    print(f'  segments: {n_segments}, clips: {len(sequence)}')
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        print('FFMPEG ERROR:')
        print(proc.stderr[-2000:])
        raise SystemExit(1)

    actual = probe_duration(out_path)
    mins = int(actual // 60)
    secs = actual - mins * 60
    print(f'  duration: {mins}:{secs:05.2f}  ({actual:.1f}s)')
    print(f'  → {out_path}')


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, seq in MEDITATIONS.items():
        build(name, seq)


if __name__ == '__main__':
    main()
