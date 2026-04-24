import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { theme } from '../config/theme';

// ─── NightSkyBackground ──────────────────────────────────────────────
//
// Full-screen immersive backdrop for the moon menu.
//
//   • Vertical gradient from deep indigo at top to near-black at bottom
//   • 60 scattered stars with slight size/brightness variation
//   • About 40% of stars gently twinkle on independent staggered cycles
//   • A large dim crescent moon partially off-screen in the upper right —
//     the same SVG path from MoonButton.tsx, scaled up. This visually
//     anchors the transition from "tapped moon button" to "arrived at moon."
//
// Stars use a seeded random function so the field is deterministic across
// renders — no distracting re-shuffling if the component re-mounts.

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Same path as MoonButton so the small button and large backdrop moon are
// visibly the same shape.
const MOON_PATH =
  'M3.32031 11.6835C3.32031 16.6541 7.34975 20.6835 12.3203 20.6835C16.1075 20.6835 19.3483 18.3443 20.6768 15.032C19.6402 15.4486 18.5059 15.6834 17.3203 15.6834C12.3497 15.6834 8.32031 11.654 8.32031 6.68342C8.32031 5.50338 8.55165 4.36259 8.96453 3.32996C5.65605 4.66028 3.32031 7.89912 3.32031 11.6835Z';

const NUM_STARS = 60;

interface Star {
  x: number;
  y: number;
  r: number;
  baseOpacity: number;
  twinkle: { duration: number; delay: number } | null;
}

// Simple seeded pseudo-random — deterministic per seed, good enough for
// positioning stars consistently across re-renders.
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function generateStars(): Star[] {
  return Array.from({ length: NUM_STARS }, (_, i) => {
    const x = seededRandom(i * 2 + 1) * SCREEN_W;
    const y = seededRandom(i * 3 + 7) * SCREEN_H;
    const r = 0.5 + seededRandom(i * 5 + 13) * 1.8;
    const baseOpacity = 0.3 + seededRandom(i * 7 + 19) * 0.6;
    const shouldTwinkle = seededRandom(i * 11 + 23) < 0.4;
    return {
      x, y, r, baseOpacity,
      twinkle: shouldTwinkle ? {
        duration: 2200 + seededRandom(i * 13 + 29) * 3000,
        delay: seededRandom(i * 17 + 31) * 6000,
      } : null,
    };
  });
}

// ─── Individual star components ──────────────────────────────────────

function StaticStar({ star }: { star: Star }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: star.x - star.r,
        top: star.y - star.r,
        width: star.r * 2,
        height: star.r * 2,
        borderRadius: star.r,
        backgroundColor: '#ffffff',
        opacity: star.baseOpacity,
      }}
    />
  );
}

function TwinklingStar({ star }: { star: Star }) {
  const opacity = useRef(new Animated.Value(star.baseOpacity)).current;

  useEffect(() => {
    if (!star.twinkle) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: star.baseOpacity * 0.25,
          duration: star.twinkle.duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: star.baseOpacity,
          duration: star.twinkle.duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const timer = setTimeout(() => loop.start(), star.twinkle.delay);
    return () => { clearTimeout(timer); loop.stop(); };
  }, [star, opacity]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: star.x - star.r,
        top: star.y - star.r,
        width: star.r * 2,
        height: star.r * 2,
        borderRadius: star.r,
        backgroundColor: '#ffffff',
        opacity,
      }}
    />
  );
}

// ─── Main component ──────────────────────────────────────────────────

export function NightSkyBackground() {
  const stars = useMemo(generateStars, []);

  // Moon is partially off-screen in the upper right.
  // Half the moon hangs over the right/top edges, so what you see looks
  // like a moon you're approaching — not a full icon sitting in the corner.
  const moonSize = 260;
  const moonOffsetX = SCREEN_W - moonSize * 0.55;
  const moonOffsetY = -moonSize * 0.35;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Gradient backdrop */}
      <LinearGradient
        colors={['#0a0f1f', '#060a18', '#020308', '#000000']}
        locations={[0, 0.4, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Large dim moon, partially off-screen upper right */}
      <View style={{ position: 'absolute', left: moonOffsetX, top: moonOffsetY }}>
        <Svg width={moonSize} height={moonSize} viewBox="0 0 24 24">
          <Defs>
            <RadialGradient id="moonBackdropHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor={theme.accent} stopOpacity="0.16" />
              <Stop offset="55%"  stopColor={theme.accent} stopOpacity="0.04" />
              <Stop offset="100%" stopColor={theme.accent} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="12" cy="12" r="11" fill="url(#moonBackdropHalo)" />
          <Path
            d={MOON_PATH}
            stroke={theme.accent}
            strokeWidth="0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.35"
          />
        </Svg>
      </View>

      {/* Stars — rendered on top of gradient and moon */}
      {stars.map((s, i) =>
        s.twinkle ? <TwinklingStar key={i} star={s} /> : <StaticStar key={i} star={s} />
      )}
    </View>
  );
}
