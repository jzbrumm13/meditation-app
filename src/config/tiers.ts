// ─── Tier Configuration ──────────────────────────────────────────────
//
// The candle snaps to exactly seven heights that correspond to preset
// meditation lengths: 5, 10, 15, 20, 30, 45, 60 minutes. MH=250 in the
// candle maps linearly to 60 minutes, so each snap height is
// (minutes/60)*250.
//
// When the candle lights, we look up the tier for the final height and
// show meditations of that length.

export interface Tier {
  id: 'five' | 'ten' | 'fifteen' | 'twenty' | 'thirty' | 'fortyFive' | 'sixty';
  label: string;
  sublabel: string;
  /** Exact meditation length in minutes. */
  minutes: number;
  /** Candle height in px that this tier corresponds to (MH = 250). */
  candlePx: number;
  /** Lower bound (inclusive) for matching a meditation to this tier. */
  matchMin: number;
  /** Upper bound (exclusive) for matching a meditation to this tier. */
  matchMax: number;
}

const MH = 250;
const pxFor = (min: number) => (min / 60) * MH;

export const TIERS: Tier[] = [
  { id: 'five',       label: '5 Minutes',  sublabel: 'a brief reset',      minutes: 5,  candlePx: pxFor(5),  matchMin: 0,  matchMax: 8   },
  { id: 'ten',        label: '10 Minutes', sublabel: 'a short sit',        minutes: 10, candlePx: pxFor(10), matchMin: 8,  matchMax: 13  },
  { id: 'fifteen',    label: '15 Minutes', sublabel: 'settle in',          minutes: 15, candlePx: pxFor(15), matchMin: 13, matchMax: 18  },
  { id: 'twenty',     label: '20 Minutes', sublabel: 'the heart of a sit', minutes: 20, candlePx: pxFor(20), matchMin: 18, matchMax: 25  },
  { id: 'thirty',     label: '30 Minutes', sublabel: 'deeper stillness',   minutes: 30, candlePx: pxFor(30), matchMin: 25, matchMax: 38  },
  { id: 'fortyFive',  label: '45 Minutes', sublabel: 'a longer sitting',   minutes: 45, candlePx: pxFor(45), matchMin: 38, matchMax: 53  },
  { id: 'sixty',      label: '60 Minutes', sublabel: 'a full hour',        minutes: 60, candlePx: pxFor(60), matchMin: 53, matchMax: 999 },
];

/** Given a candle height in pixels, return the matching tier (or null if below the smallest snap). */
export function tierForCandleHeight(cH: number, maxHeight = MH): Tier | null {
  if (cH < pxFor(5) * 0.6) return null; // below ignition threshold
  // Find the tier whose candlePx is closest to cH.
  return TIERS.reduce((best, t) =>
    Math.abs(t.candlePx - cH) < Math.abs(best.candlePx - cH) ? t : best,
  TIERS[0]);
}

/** Given a meditation length in minutes, find its matching tier. */
export function tierForMinutes(minutes: number): Tier {
  return TIERS.find(t => minutes >= t.matchMin && minutes < t.matchMax) ?? TIERS[0];
}
