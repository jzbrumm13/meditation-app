import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, Pressable, StyleSheet, Easing } from 'react-native';
import Svg, { Path, Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { theme } from '../config/theme';

// ─── MoonButton ──────────────────────────────────────────────────────
//
// Uses Jason's attached moon SVG (svgrepo, stroked crescent). The path
// geometry is preserved verbatim — only the colour and stroke weight
// adapt to the app theme, and a soft halo is added beneath.
//
//   • Idle: ~55% opacity, gentle breath-like pulse (6s cycle)
//   • Tiny 4-point sparkles drift in and out around it like a soft glimmer
//   • Pressed: briefly scales down to confirm the tap
//   • `visible` prop fades in/out without unmounting
//   • Positioned with a 54px top offset so the iOS status bar
//     (battery, wifi, signal on iPhone 13) never occludes it.

interface Props {
  visible: boolean;
  onPress: () => void;
  /** Rendered size of the moon in px. Default 34. */
  size?: number;
}

// Path data from moon-svgrepo-com.svg, viewBox 0 0 24 24.
const MOON_PATH =
  'M3.32031 11.6835C3.32031 16.6541 7.34975 20.6835 12.3203 20.6835C16.1075 20.6835 19.3483 18.3443 20.6768 15.032C19.6402 15.4486 18.5059 15.6834 17.3203 15.6834C12.3497 15.6834 8.32031 11.654 8.32031 6.68342C8.32031 5.50338 8.55165 4.36259 8.96453 3.32996C5.65605 4.66028 3.32031 7.89912 3.32031 11.6835Z';

// Classic 4-point star ("twinkle") drawn in a small viewBox for sparkles.
// Two thin diamond rays crossed — the shape most readers interpret as a glint.
const SPARKLE_PATH =
  'M 8 0 L 9 7 L 16 8 L 9 9 L 8 16 L 7 9 L 0 8 L 7 7 Z';

// Each sparkle is placed at a fixed offset from the moon center (in
// halo-space coordinates) and has its own animation timing so the
// glimmer feels organic rather than marching in lock-step.
interface SparkleSpec {
  dx: number;      // offset from moon center, as a fraction of halo size
  dy: number;
  size: number;    // render size in px
  delay: number;   // initial delay before first twinkle (ms)
  duration: number;// duration of one full twinkle cycle (ms)
  maxOpacity: number;
}
const SPARKLES: SparkleSpec[] = [
  { dx: -0.42, dy: -0.30, size: 8,  delay: 0,    duration: 2200, maxOpacity: 0.9 },
  { dx:  0.38, dy: -0.40, size: 6,  delay: 600,  duration: 2600, maxOpacity: 0.75 },
  { dx:  0.46, dy:  0.22, size: 10, delay: 1400, duration: 2000, maxOpacity: 1.0 },
  { dx: -0.38, dy:  0.34, size: 5,  delay: 800,  duration: 3000, maxOpacity: 0.6 },
  { dx:  0.12, dy:  0.48, size: 7,  delay: 2000, duration: 2400, maxOpacity: 0.8 },
];

export function MoonButton({ visible, onPress, size = 34 }: Props) {
  // Fade on visibility
  const visOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(visOpacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? 600 : 300,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, visOpacity]);

  // Breath-like pulse on the moon body itself — subtle, 6s cycle.
  const pulseOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 0.7,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseOpacity]);

  // One Animated.Value per sparkle, each running its own independent
  // twinkle loop. Memoised so we don't create new values on every render.
  const sparkleOpacities = useMemo(
    () => SPARKLES.map(() => new Animated.Value(0)),
    [],
  );
  const sparkleScales = useMemo(
    () => SPARKLES.map(() => new Animated.Value(0.5)),
    [],
  );

  useEffect(() => {
    const loops = SPARKLES.map((spec, i) => {
      const op = sparkleOpacities[i];
      const sc = sparkleScales[i];
      const cycle = Animated.sequence([
        // Fade + scale in
        Animated.parallel([
          Animated.timing(op, {
            toValue: spec.maxOpacity,
            duration: spec.duration * 0.25,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(sc, {
            toValue: 1,
            duration: spec.duration * 0.25,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
        ]),
        // Brief hold
        Animated.delay(spec.duration * 0.1),
        // Fade + scale out
        Animated.parallel([
          Animated.timing(op, {
            toValue: 0,
            duration: spec.duration * 0.35,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(sc, {
            toValue: 0.5,
            duration: spec.duration * 0.35,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        // Rest before the next twinkle
        Animated.delay(spec.duration * 0.3),
      ]);

      const loop = Animated.loop(cycle);
      const timer = setTimeout(() => loop.start(), spec.delay);
      return { loop, timer };
    });

    return () => {
      loops.forEach(({ loop, timer }) => {
        clearTimeout(timer);
        loop.stop();
      });
    };
  }, [sparkleOpacities, sparkleScales]);

  // Press feedback — brief squish
  const pressScale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    Animated.timing(pressScale, {
      toValue: 0.88,
      duration: 80,
      useNativeDriver: true,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  // Halo + sparkle field extends ~80% beyond the moon itself so twinkles
  // have room to float out around the crescent.
  const halo = size * 1.8;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.wrapper, { opacity: Animated.multiply(visOpacity, pulseOpacity) }]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        accessibilityLabel="Open menu"
        accessibilityRole="button"
      >
        <Animated.View
          style={[
            styles.moonBox,
            { width: halo, height: halo, transform: [{ scale: pressScale }] },
          ]}
        >
          {/* Soft halo behind everything */}
          <Svg width={halo} height={halo} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="moonHalo" cx="50%" cy="50%" r="50%">
                <Stop offset="0%"   stopColor={theme.accent} stopOpacity="0.28" />
                <Stop offset="55%"  stopColor={theme.accent} stopOpacity="0.08" />
                <Stop offset="100%" stopColor={theme.accent} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx={halo / 2} cy={halo / 2} r={halo / 2} fill="url(#moonHalo)" />
          </Svg>

          {/* Sparkles drifting around the moon */}
          {SPARKLES.map((spec, i) => {
            // Convert dx/dy fractions into pixel offsets within the halo box.
            const cx = halo / 2 + spec.dx * halo;
            const cy = halo / 2 + spec.dy * halo;
            return (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={[
                  styles.sparkle,
                  {
                    left: cx - spec.size / 2,
                    top: cy - spec.size / 2,
                    width: spec.size,
                    height: spec.size,
                    opacity: sparkleOpacities[i],
                    transform: [{ scale: sparkleScales[i] }],
                  },
                ]}
              >
                <Svg width={spec.size} height={spec.size} viewBox="0 0 16 16">
                  <Path d={SPARKLE_PATH} fill={theme.accent} />
                </Svg>
              </Animated.View>
            );
          })}

          {/* The crescent itself, centred in the halo box */}
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
              d={MOON_PATH}
              stroke={theme.accent}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.6}
            />
          </Svg>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    // 54px clears iPhone 13 status bar (time, battery, signal) with a
    // little breathing room. On devices without a notch this just sits a
    // little lower than usual — still in the top-right corner visually.
    top: 54,
    right: 14,
    zIndex: 50,
  },
  moonBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    position: 'absolute',
  },
});
