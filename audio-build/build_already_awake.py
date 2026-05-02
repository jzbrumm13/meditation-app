#!/usr/bin/env python3
"""
Build the "Already Awake" meditation MP3s (5/10/15/20/30 min) from the 9
ElevenLabs renders sitting in ~/Documents/meditations/.

Section map (clip durations in parens):
  Opening   — 7.1 (23.6s)
  Teach 1   — 7.2 (23.1s) + 7.3 (21.6s)
  [ silence A ]
  Teach 2   — 7.4 (21.9s) + 7.5 (16.0s)
  [ silence B ]
  Teach 3   — 7.6 (25.5s) + 7.7  (5.7s)        ← skipped in 5-min
  [ silence C ]
  Closing   — 7.8 (10.2s) + 7.9 (12.4s)
  [ bell ]

Each output is a single MP3 of:
  [1.0s lead silence] clip [silence] clip [silence] ... clip [silence] [bell]

Encoding: 96 kbps mono MP3 — same profile as already-here-* and inquiry-4-*.
"""

import subprocess
from pathlib import Path

CLIPS_DIR  = Path('/Users/jbrumm/Documents/meditations')
OUTPUT_DIR = Path('/Users/jbrumm/meditation-app/audio-build/output')
BELL       = Path('/Users/jbrumm/Downloads/bell.wav')
FFMPEG     = '/opt/homebrew/bin/ffmpeg'
FFPROBE    = '/opt/homebrew/bin/ffprobe'

# Clip filenames (quoted because the source files have a space).
OPEN     = 'med 7.1.mp3'
T1A, T1B = 'med 7.2.mp3', 'med 7.3.mp3'
T2A, T2B = 'med 7.4.mp3', 'med 7.5.mp3'
T3A, T3B = 'med 7.6.mp3', 'med 7.7.mp3'
CLOSEA, CLOSEB = 'med 7.8.mp3', 'med 7.9.mp3'

LEAD_SILENCE = 1.0  # seconds of silence at the very start
INTRA_PAUSE  = 4.0  # short pause between sub-clips inside a section

# Per-meditation sequence: (clip_filename, silence_after_in_seconds).
#
# Each meditation has 3 (or 4) long silence blocks:
#   • Between Teaching 1 and Teaching 2  (silence A)
#   • Between Teaching 2 and Teaching 3  (silence B)
#   • Between Teaching 3 and Closing     (silence C, omitted in 5-min)
#   • After Closing, before the bell     (closing silence — eyes open practice)
#
# The closing silence is weighted 1.5× the between-section silences so the
# eyes-open block is clearly the longest single sit in each session.
MEDITATIONS = {
    # 5-min: skip Teaching 3. Two between-section silences + closing silence.
    'already-awake-5min.mp3': [
        (OPEN,   INTRA_PAUSE),
        (T1A,    INTRA_PAUSE),
        (T1B,    42),            # silence A
        (T2A,    INTRA_PAUSE),
        (T2B,    42),            # silence B
        (CLOSEA, INTRA_PAUSE),
        (CLOSEB, 63),            # eyes-open silence (~1:03)
    ],
    # 10-min: between-section silences ~92s, eyes-open ~2:17.
    'already-awake-10min.mp3': [
        (OPEN,   INTRA_PAUSE),
        (T1A,    INTRA_PAUSE),
        (T1B,    92),            # silence A
        (T2A,    INTRA_PAUSE),
        (T2B,    92),            # silence B
        (T3A,    INTRA_PAUSE),
        (T3B,    92),            # silence C
        (CLOSEA, INTRA_PAUSE),
        (CLOSEB, 137),           # eyes-open silence (~2:17)
    ],
    # 15-min: ~158s between sections, eyes-open ~3:57.
    'already-awake-15min.mp3': [
        (OPEN,   INTRA_PAUSE),
        (T1A,    INTRA_PAUSE),
        (T1B,    158),
        (T2A,    INTRA_PAUSE),
        (T2B,    158),
        (T3A,    INTRA_PAUSE),
        (T3B,    158),
        (CLOSEA, INTRA_PAUSE),
        (CLOSEB, 238),           # eyes-open silence (~3:58)
    ],
    # 20-min: ~225s between sections, eyes-open ~5:37.
    'already-awake-20min.mp3': [
        (OPEN,   INTRA_PAUSE),
        (T1A,    INTRA_PAUSE),
        (T1B,    225),
        (T2A,    INTRA_PAUSE),
        (T2B,    225),
        (T3A,    INTRA_PAUSE),
        (T3B,    225),
        (CLOSEA, INTRA_PAUSE),
        (CLOSEB, 337),           # eyes-open silence (~5:37)
    ],
    # 30-min: ~358s between sections, eyes-open ~8:58.
    'already-awake-30min.mp3': [
        (OPEN,   INTRA_PAUSE),
        (T1A,    INTRA_PAUSE),
        (T1B,    358),
        (T2A,    INTRA_PAUSE),
        (T2B,    358),
        (T3A,    INTRA_PAUSE),
        (T3B,    358),
        (CLOSEA, INTRA_PAUSE),
        (CLOSEB, 538),           # eyes-open silence (~8:58)
    ],
}


def probe_duration(path: Path) -> float:
    """Return the duration of an audio file in seconds."""
    out = subprocess.check_output([
        FFPROBE, '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'csv=p=0', str(path),
    ]).decode().strip()
    return float(out)


def build(out_name: str, sequence: list[tuple[str, float]]) -> None:
    """Concatenate clips + silences + bell into one MP3."""
    inputs: list[str] = []
    for clip_name, _ in sequence:
        inputs.extend(['-i', str(CLIPS_DIR / clip_name)])
    inputs.extend(['-i', str(BELL)])
    bell_idx = len(sequence)

    filter_parts: list[str] = []
    concat_inputs: list[str] = []

    # Lead silence
    filter_parts.append(f'anullsrc=cl=mono:r=44100:d={LEAD_SILENCE}[lead]')
    concat_inputs.append('[lead]')

    for i, (_, silence_after) in enumerate(sequence):
        # Normalise each clip's format so the concat filter doesn't choke
        # on mismatched sample-rate / channel layout from ElevenLabs renders.
        filter_parts.append(
            f'[{i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=mono[c{i}]'
        )
        concat_inputs.append(f'[c{i}]')
        if silence_after > 0:
            filter_parts.append(
                f'anullsrc=cl=mono:r=44100:d={silence_after}[s{i}]'
            )
            concat_inputs.append(f'[s{i}]')

    # Bell at the very end
    filter_parts.append(
        f'[{bell_idx}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=mono[bell]'
    )
    concat_inputs.append('[bell]')

    n_segments = len(concat_inputs)
    filter_parts.append(
        ''.join(concat_inputs) + f'concat=n={n_segments}:v=0:a=1[out]'
    )

    out_path = OUTPUT_DIR / out_name
    cmd = [
        FFMPEG, '-y',
        *inputs,
        '-filter_complex', ';'.join(filter_parts),
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
