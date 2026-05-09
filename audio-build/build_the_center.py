#!/usr/bin/env python3
"""
Build "The Centre" meditation MP3s (10/15/20/30 min) from the 18
ElevenLabs renders sitting in ~/Documents/meditations/.

Script structure (clip durations in parens):
  Settling     — 8.1                (8.6s)
  3rd person   — 8.2.1 + 8.2.2      (11.1 + 22.0s)   [sub-pause between halves]
  Ceiling      — 8.3.1 + 8.3.2      (17.8 +  5.7s)   [sub-pause]
  City         — 8.4                (23.7s)
  Country      — 8.5.1 + 8.5.2      (16.7 + 11.3s)   [sub-pause]
  Earth        — 8.6                (23.6s)
  Solar system — 8.7                (23.7s)
  Galaxy       — 8.8                (35.4s)
  Universe     — 8.9.1 + 8.9.2      (26.0 + 40.8s)   [sub-pause]   ← ego-drop ending
  Pause prompt — 8.10               (10.2s)          [PONDER silence — much longer]
  Return       — 8.11               (23.7s)
  Back to Earth— 8.12                (18.5s)
  Back to body — 8.13               (10.5s)
  Closing      — 8.14               (17.6s)          [closing silence]
  [ bell ]

The "sub-pause" between split halves is short (~1.5s) because those splits
were made for ElevenLabs's sake, not because the user should feel a real
break. The "ponder" silence after 8.10 is the longest single silence in
each variant — that's where the universe-scale image is meant to land.

Total narration runs ~5.8 min; the rest of each variant's runtime is
silence calibrated to fill out 10/15/20/30 min exactly.

Encoding: 96 kbps mono MP3 — same profile as the other Glimmer outputs.
"""

import subprocess
from pathlib import Path

CLIPS_DIR  = Path('/Users/jbrumm/Documents/meditations')
OUTPUT_DIR = Path('/Users/jbrumm/meditation-app/audio-build/output')
BELL       = Path('/Users/jbrumm/Downloads/bell.wav')
FFMPEG     = '/opt/homebrew/bin/ffmpeg'
FFPROBE    = '/opt/homebrew/bin/ffprobe'

# Clip filenames (quoted because the source files have a space).
S1     = 'med 8.1.mp3'
S2A    = 'med 8.2.1.mp3'
S2B    = 'med 8.2.2.mp3'
S3A    = 'med 8.3.1.mp3'
S3B    = 'med 8.3.2.mp3'
S4     = 'med 8.4.mp3'
S5A    = 'med 8.5.1.mp3'
S5B    = 'med 8.5.2.mp3'
S6     = 'med 8.6.mp3'
S7     = 'med 8.7.mp3'
S8     = 'med 8.8.mp3'
S9A    = 'med 8.9.1.mp3'
S9B    = 'med 8.9.2.mp3'
S10    = 'med 8.10.mp3'
S11    = 'med 8.11.mp3'
S12    = 'med 8.12.mp3'
S13    = 'med 8.13.mp3'
S14    = 'med 8.14.mp3'

LEAD_SILENCE = 1.0  # seconds of silence at the very start
SUB_PAUSE    = 1.5  # tight pause between halves of a split segment
CLOSE_PAUSE  = 5.0  # short silence after 8.14 before the bell


def sequence(reg: float, ponder: float) -> list[tuple[str, float]]:
    """Build the full (clip, silence_after) sequence for a 10/15/20/30 variant.

    `reg` is the silence after each major segment transition; `ponder`
    is the long silence after the prompt at 8.10.
    """
    return [
        (S1,  reg),         # Settling → 3rd person
        (S2A, SUB_PAUSE),   # within 3rd person
        (S2B, reg),         # 3rd person → ceiling
        (S3A, SUB_PAUSE),   # within ceiling
        (S3B, reg),         # ceiling → city
        (S4,  reg),         # city → country
        (S5A, SUB_PAUSE),   # within country
        (S5B, reg),         # country → Earth
        (S6,  reg),         # Earth → solar system
        (S7,  reg),         # solar system → galaxy
        (S8,  reg),         # galaxy → universe
        (S9A, SUB_PAUSE),   # within universe
        (S9B, reg),         # universe → ponder prompt
        (S10, ponder),      # PONDER — the long sit
        (S11, reg),         # return begins → back to Earth
        (S12, reg),         # back to Earth → back to body
        (S13, reg),         # back to body → closing
        (S14, CLOSE_PAUSE), # closing → bell
    ]


# Per-variant pause arithmetic (chosen to land near the target minute).
# Verified against narration-total of 346.9s + inter-clip silences + lead +
# closing → see comment in module docstring.
#
# No 5-min variant: pure narration alone is 5:36 even after cutting 8.10,
# and any further cuts (e.g. 8.3 + 8.11/8.12) drop too much of the arc to
# justify a separate tier. Users wanting a short Center session pick 10 min.
MEDITATIONS = {
    'the-center-10min.mp3': sequence(reg=15,  ponder=60),
    'the-center-15min.mp3': sequence(reg=35,  ponder=120),
    'the-center-20min.mp3': sequence(reg=55,  ponder=180),
    'the-center-30min.mp3': sequence(reg=100, ponder=240),
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
