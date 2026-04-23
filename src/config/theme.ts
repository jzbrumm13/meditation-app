// ─── App Theme ───────────────────────────────────────────────────────
// Intentionally minimal. The candle itself provides all the visual drama —
// surrounding UI should fade into the background.
//
// Everything lives on a near-black base so it harmonises with the candle's
// `#000` canvas background without a visible seam where WebView meets RN view.

export const theme = {
  bg:        '#000000',        // true black — matches candle page
  surface:   '#0d0d10',        // sheet / card background
  surfaceHi: '#151519',        // hover / pressed state
  border:    'rgba(255,255,255,0.08)',
  text:      '#f0ece4',        // warm off-white, matches candle's flame tones
  textDim:   '#7a7268',        // warm grey
  textFaint: '#3a342c',        // very subdued
  accent:    '#f5c678',        // warm amber, picks up the flame
  accentSoft:'rgba(245,198,120,0.15)',
  radius: {
    sm: 8,
    md: 14,
    lg: 20,
    pill: 999,
  },
  space: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
  },
  sheet: {
    // Bottom-sheet fully-open height as a fraction of the screen.
    // 0.55 leaves the upper ~45% of the candle visible behind the sheet,
    // so the flame and flicker are still peeking through while the user chooses.
    height: 0.55,
  },
} as const;

export type Theme = typeof theme;
