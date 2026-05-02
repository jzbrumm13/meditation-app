import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import Svg, {
  Defs, LinearGradient as SvgLinearGradient, Stop, RadialGradient,
  Path, Circle, Ellipse,
} from 'react-native-svg';

// ─── ShootingStar ────────────────────────────────────────────────────
//
// A proper comet: a hot white-gold head wrapped in a soft halo, trailing
// a two-layer plasma tail (wide diffuse glow + narrow bright core) along
// a gently curved arc. Each firing randomizes direction (L→R / R→L),
// slant (up/down), and tail length (short flash vs long streak) so no
// two strikes look the same.
//
// Fires every 3–5 minutes, randomly. Present on the home screen at all
// times, including during meditation. Kept subtle on purpose — this is a
// meditation app, not a planetarium.

const { width: WINDOW_W, height: WINDOW_H } = Dimensions.get('window');

// Tunables:
const MIN_DELAY_MS = 180000;  // 3 minutes between stars (min)
const MAX_DELAY_MS = 300000;  // 5 minutes between stars (max)
const STREAK_DURATION_MS = 1300;

// Tail geometry — lengths vary per firing, so we size the SVG canvas for
// the max possible length. The head sits at the geometric center of the
// SVG canvas, so rotating the wrapper View rotates around the head.
const MIN_TAIL = 120;
const MAX_TAIL = 280;

const HEAD_RADIUS = 3.0;        // bright head core
const HALO_RADIUS = 13;         // soft halo around head
const TAIL_CORE_WIDTH = 3.2;    // inner bright streak width at head
const TAIL_GLOW_WIDTH = 9.0;    // outer diffuse glow width at head
const SPARKLE_LENGTH = 12;      // perpendicular lens-flare spike (each side)
const SPARKLE_WIDTH = 1.3;

const SVG_PADDING = Math.max(HALO_RADIUS, SPARKLE_LENGTH) + 4;
const SVG_W = (MAX_TAIL + SVG_PADDING * 2) * 2;  // doubled so head sits at SVG center
const SVG_H = SVG_PADDING * 2;
const HEAD_X = SVG_W / 2;
const HEAD_Y = SVG_H / 2;

const PEAK_OPACITY = 0.9;

interface StreakConfig {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  /** Pixels of mid-arc sag (sign follows slant direction). */
  sag: number;
  /** Overall rotation (radians) so the tail trails behind the head. */
  angleRad: number;
  /** Actual tail length for this firing (some short, some long). */
  tailLength: number;
  key: number;
}

function randomConfig(index: number): StreakConfig {
  // Randomize travel direction (L→R vs R→L) and vertical slant so the eye
  // never learns to expect the streak in a specific place or trajectory.
  const leftToRight = Math.random() < 0.5;
  const slantDown = Math.random() < 0.55; // slight bias toward downward

  const startX = leftToRight ? -40 : WINDOW_W + 40;
  const endX   = leftToRight ? WINDOW_W + 40 : -40;

  // Vertical band: always in the upper third, with variable travel so
  // slants range from near-horizontal to steeply diagonal.
  const verticalTravel = WINDOW_H * (0.05 + Math.random() * 0.18); // 5–23%
  let startY: number;
  let endY: number;
  if (slantDown) {
    startY = WINDOW_H * (0.04 + Math.random() * 0.08);
    endY = startY + verticalTravel;
  } else {
    endY = WINDOW_H * (0.04 + Math.random() * 0.08);
    startY = endY + verticalTravel;
  }

  // Arc bulges away from the straight line — sign follows slant direction.
  const sagMagnitude = 12 + Math.random() * 24;
  const sag = slantDown ? sagMagnitude : -sagMagnitude;

  const angleRad = Math.atan2(endY - startY, endX - startX);

  // Tail length — some strikes are short bright flashes, others long
  // dramatic streaks. Weighted toward the longer end because long tails
  // feel more satisfying.
  const tailLength = MIN_TAIL + Math.pow(Math.random(), 0.7) * (MAX_TAIL - MIN_TAIL);

  return { startX, startY, endX, endY, sag, angleRad, tailLength, key: index };
}

export function ShootingStar() {
  const [config, setConfig] = useState<StreakConfig | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let counter = 0;

    const scheduleNext = () => {
      if (cancelled) return;
      const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
      timeoutId = setTimeout(fire, delay);
    };

    const fire = () => {
      if (cancelled) return;
      counter += 1;
      setConfig(randomConfig(counter));

      progress.setValue(0);
      opacity.setValue(0);

      // Opacity envelope: fast ignition (the flash of the meteor entering
      // atmosphere), brief peak, then a long slow dissolve. Bias the
      // fade-out long so the star feels like it's dissipating into space
      // rather than blinking off.
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: PEAK_OPACITY,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(STREAK_DURATION_MS * 0.25),
        Animated.timing(opacity, {
          toValue: 0,
          duration: STREAK_DURATION_MS * 0.65,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      // Motion: custom bezier — sharp fast entry, long gentle deceleration.
      // Reads more like a falling meteor than a constant-speed slide.
      Animated.timing(progress, {
        toValue: 1,
        duration: STREAK_DURATION_MS,
        easing: Easing.bezier(0.08, 0.55, 0.2, 1),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) scheduleNext();
      });
    };

    // First streak appears within the first 1–2 minutes so a new user sees
    // the effect exists; after that the 3–5 min cadence takes over.
    timeoutId = setTimeout(fire, 60000 + Math.random() * 60000);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [progress, opacity]);

  if (!config) return null;

  const { startX, startY, endX, endY, sag, angleRad, tailLength } = config;

  // Curved trajectory via sine sag at midpoint.
  const samples = [0, 0.25, 0.5, 0.75, 1];
  const xPoints = samples.map((t) => startX + (endX - startX) * t);
  const yPoints = samples.map(
    (t) => startY + (endY - startY) * t + sag * Math.sin(Math.PI * t),
  );

  const translateX = progress.interpolate({
    inputRange: samples,
    outputRange: xPoints,
  });
  const translateY = progress.interpolate({
    inputRange: samples,
    outputRange: yPoints,
  });

  // Tail tip X for this firing's length. Head is at HEAD_X (center of SVG),
  // tail extends to the left (negative direction in local coords); after
  // rotation the tail naturally trails behind the head.
  const tailTipX = HEAD_X - tailLength;

  return (
    <Animated.View
      pointerEvents="none"
      key={config.key}
      style={[
        styles.wrapper,
        {
          width: SVG_W,
          height: SVG_H,
          marginLeft: -SVG_W / 2,
          marginTop: -SVG_H / 2,
          opacity,
          transform: [
            { translateX },
            { translateY },
            { rotate: `${angleRad}rad` },
          ],
        },
      ]}
    >
      <Svg
        width={SVG_W}
        height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      >
        <Defs>
          {/* Outer glow tail: wide, diffuse, warm-tinted. Gives the plasma
              halo around the inner bright streak. */}
          <SvgLinearGradient id="tailGlow" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"    stopColor="#ffeccf" stopOpacity="0" />
            <Stop offset="0.55" stopColor="#ffeccf" stopOpacity="0.08" />
            <Stop offset="0.85" stopColor="#fff4de" stopOpacity="0.28" />
            <Stop offset="1"    stopColor="#ffffff" stopOpacity="0.55" />
          </SvgLinearGradient>

          {/* Inner bright core: narrow, sharp, pushes most of the
              brightness into the last ~15% near the head. */}
          <SvgLinearGradient id="tailCore" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"    stopColor="#ffffff" stopOpacity="0" />
            <Stop offset="0.5"  stopColor="#ffffff" stopOpacity="0.1" />
            <Stop offset="0.82" stopColor="#ffffff" stopOpacity="0.55" />
            <Stop offset="1"    stopColor="#ffffff" stopOpacity="1" />
          </SvgLinearGradient>

          {/* Soft halo around the head — radial, warm-white → transparent. */}
          <RadialGradient
            id="halo"
            cx={HEAD_X}
            cy={HEAD_Y}
            rx={HALO_RADIUS}
            ry={HALO_RADIUS}
            fx={HEAD_X}
            fy={HEAD_Y}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0"    stopColor="#ffffff" stopOpacity="0.95" />
            <Stop offset="0.35" stopColor="#fff4de" stopOpacity="0.45" />
            <Stop offset="0.75" stopColor="#ffeccf" stopOpacity="0.15" />
            <Stop offset="1"    stopColor="#ffeccf" stopOpacity="0" />
          </RadialGradient>

          {/* Perpendicular lens-flare spike — a very thin, tall bright
              streak across the head perpendicular to the tail direction.
              Gives the head a subtle "star" sparkle so it reads as light,
              not just a painted dot. Gradient is aligned vertically to
              match the ellipse's tall-thin shape. */}
          <RadialGradient
            id="sparkle"
            cx={HEAD_X}
            cy={HEAD_Y}
            rx={SPARKLE_WIDTH}
            ry={SPARKLE_LENGTH}
            fx={HEAD_X}
            fy={HEAD_Y}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0"   stopColor="#ffffff" stopOpacity="0.9" />
            <Stop offset="0.5" stopColor="#ffffff" stopOpacity="0.3" />
            <Stop offset="1"   stopColor="#ffffff" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Outer glow tail — wider, softer, drawn FIRST so the core sits
            on top. */}
        <Path
          d={[
            `M ${tailTipX} ${HEAD_Y}`,
            `L ${HEAD_X} ${HEAD_Y - TAIL_GLOW_WIDTH / 2}`,
            `L ${HEAD_X} ${HEAD_Y + TAIL_GLOW_WIDTH / 2}`,
            'Z',
          ].join(' ')}
          fill="url(#tailGlow)"
        />

        {/* Inner bright core tail */}
        <Path
          d={[
            `M ${tailTipX + tailLength * 0.15} ${HEAD_Y}`,  // core starts 15% in from tip
            `L ${HEAD_X} ${HEAD_Y - TAIL_CORE_WIDTH / 2}`,
            `L ${HEAD_X} ${HEAD_Y + TAIL_CORE_WIDTH / 2}`,
            'Z',
          ].join(' ')}
          fill="url(#tailCore)"
        />

        {/* Halo around the head */}
        <Circle cx={HEAD_X} cy={HEAD_Y} r={HALO_RADIUS} fill="url(#halo)" />

        {/* Perpendicular lens-flare spike: a thin horizontal ellipse that
            we rotate 90° via SVG transform. This adds the subtle star
            sparkle across the head perpendicular to the tail. */}
        <Ellipse
          cx={HEAD_X}
          cy={HEAD_Y}
          rx={SPARKLE_WIDTH}
          ry={SPARKLE_LENGTH}
          fill="url(#sparkle)"
          opacity={0.75}
        />

        {/* Bright white head — drawn last so it's always the brightest
            pixel on the streak. */}
        <Circle cx={HEAD_X} cy={HEAD_Y} r={HEAD_RADIUS} fill="#ffffff" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
