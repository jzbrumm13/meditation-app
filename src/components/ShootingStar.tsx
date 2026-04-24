import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, Animated, Easing, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ─── ShootingStar ────────────────────────────────────────────────────
//
// Occasional streak across the upper portion of the screen. Present on
// the home screen at all times — including during meditation, where it
// acts as a gentle reminder that the sky is alive without demanding
// attention. Each streak lasts about a second; the next one is 3–5
// minutes away. Direction and exact y-position are randomized per firing
// so the eye never learns to expect it in a specific place.

const { width: WINDOW_W, height: WINDOW_H } = Dimensions.get('window');

// Tunables (change these if the effect ever feels wrong):
const MIN_DELAY_MS = 180000; // 3 minutes — shortest wait between stars
const MAX_DELAY_MS = 300000; // 5 minutes — longest wait between stars
const STREAK_DURATION_MS = 1000; // time for the streak to cross the screen
const STREAK_LENGTH = 140;       // pixel length of the visible streak
const STREAK_THICKNESS = 2;      // pixel thickness
const PEAK_OPACITY = 0.7;        // never blindingly bright — this is meditation

interface StreakConfig {
  // y-position of the streak's left endpoint, as a fraction of window height.
  // Kept in the upper portion so it doesn't cut across the candle flame.
  yStart: number;
  // Angle in degrees — negative = downward-right diagonal.
  angleDeg: number;
  // Unique key so React re-mounts the view on each firing (cheap way to
  // reset any internal state without hand-resetting every Animated value).
  key: number;
}

function randomConfig(index: number): StreakConfig {
  return {
    // 5% – 28% of screen height: well above the candle, safely clear of the
    // notch / status bar area on most devices.
    yStart: 0.05 + Math.random() * 0.23,
    // -10° to -25° — always trending downward, which reads more "shooting
    // star" than a flat horizontal streak.
    angleDeg: -10 - Math.random() * 15,
    key: index,
  };
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

      // Reset animated values for this firing.
      progress.setValue(0);
      opacity.setValue(0);

      // Opacity: fast fade in, hold, fade out. Overall envelope roughly
      // matches the cross-screen travel duration.
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: PEAK_OPACITY,
          duration: 160,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(STREAK_DURATION_MS - 160 - 280),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 280,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      // Travel across the screen.
      Animated.timing(progress, {
        toValue: 1,
        duration: STREAK_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) scheduleNext();
      });
    };

    // First streak appears within the first ~1–2 minutes so a new user sees
    // the effect exists, then the ongoing 3–5 minute cadence takes over.
    timeoutId = setTimeout(fire, 60000 + Math.random() * 60000);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [progress, opacity]);

  if (!config) return null;

  // Compute travel path. The streak enters slightly off the left edge and
  // exits slightly off the right edge, so its head appears to emerge from
  // nowhere and dissolve into nowhere — not hit the frame edge.
  const startX = -STREAK_LENGTH;
  const endX = WINDOW_W + STREAK_LENGTH;
  const startY = WINDOW_H * config.yStart;
  // Downward drift proportional to horizontal travel × |tan(angle)|.
  const tan = Math.tan((config.angleDeg * Math.PI) / 180);
  const endY = startY + (endX - startX) * Math.abs(tan);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [startX, endX],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [startY, endY],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.streakWrapper,
        {
          opacity,
          transform: [
            { translateX },
            { translateY },
            { rotate: `${config.angleDeg}deg` },
          ],
        },
      ]}
    >
      {/* The streak itself: a horizontal gradient from transparent tail to
          a bright head. The gradient is what sells it as a shooting star
          rather than a flat line. */}
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,1)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.streak}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  streakWrapper: {
    position: 'absolute',
    // Lay out at 0,0; transforms move it into position.
    left: 0,
    top: 0,
    width: STREAK_LENGTH,
    height: STREAK_THICKNESS,
    // Anchor rotation at the streak's head so the angle feels consistent.
    // RN doesn't support transform-origin, but because the wrapper is only
    // STREAK_THICKNESS tall, rotation around the center is visually identical.
  },
  streak: {
    width: STREAK_LENGTH,
    height: STREAK_THICKNESS,
    borderRadius: STREAK_THICKNESS,
    // Soft glow so the head feels like light, not a painted line.
    shadowColor: '#fff',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
});
