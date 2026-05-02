import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, Pressable, Animated, Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';

import { Meditation } from '../services/meditations';
import { isFavorite, toggleFavorite } from '../services/favorites';
import { theme } from '../config/theme';

// ─── FavoriteHeart ───────────────────────────────────────────────────
//
// A faint heart that appears below the candle during the wind-down
// phase (after the user snuffs the candle, or after it burns out
// naturally). Tapping it favorites the meditation that just played.
//
// Design language matches the rest of the app:
//   • thin amber stroke (theme.accent), no labels
//   • hollow when not favorited, filled with a soft warm glow when favorited
//   • fades in over ~400ms as the candle starts smoking; fades out as the
//     candle finishes resetting
//
// Parent owns the visibility timer (it knows when the candle starts and
// finishes resetting). This component just drives the fade animation.

interface Props {
  /** The meditation the heart will favorite/unfavorite when tapped. */
  meditation: Meditation | null;
  /** When true, the heart fades in. When false, it fades out. */
  visible: boolean;
}

const HEART_PATH =
  'M12 21s-7.5-4.5-10-9.5C.5 7 4 3 8 3c2 0 3 1 4 2 1-1 2-2 4-2 4 0 7.5 4 6 8.5-2.5 5-10 9.5-10 9.5z';
const HEART_VIEWBOX = '0 0 24 24';
const HEART_DRAW_SIZE = 30;
// Peak opacity is intentionally low — the heart should feel like a faint
// suggestion, not a UI element demanding attention.
const PEAK_OPACITY = 0.45;

export function FavoriteHeart({ meditation, visible }: Props) {
  const [favorited, setFavorited] = useState(false);

  // Whether the heart is mounted in the tree at all. We unmount it after
  // the fade-out completes so a hidden heart doesn't intercept touches.
  const [mounted, setMounted] = useState(false);

  // Two animated values:
  //   • opacity — outer fade in/out
  //   • fill    — 0 = hollow, 1 = filled (animates on tap)
  const opacity = useRef(new Animated.Value(0)).current;
  const fillAmount = useRef(new Animated.Value(0)).current;
  const tapScale = useRef(new Animated.Value(1)).current;

  // When the meditation changes (a new sit ended), reload the favorited
  // state so the heart can show its initial fill correctly.
  useEffect(() => {
    if (!meditation) {
      setFavorited(false);
      fillAmount.setValue(0);
      return;
    }
    let cancelled = false;
    isFavorite(meditation.id)
      .then((fav) => {
        if (cancelled) return;
        setFavorited(fav);
        fillAmount.setValue(fav ? 1 : 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [meditation, fillAmount]);

  // Drive the fade animation off the visible prop.
  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(opacity, {
        toValue: PEAK_OPACITY,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 1000,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, opacity]);

  if (!mounted || !meditation) return null;

  const onPress = async () => {
    Haptics.selectionAsync().catch(() => {});

    // Optimistic UI: flip state immediately, then persist.
    const next = !favorited;
    setFavorited(next);

    // Tap bounce — small scale pulse
    Animated.sequence([
      Animated.timing(tapScale, {
        toValue: 1.18,
        duration: 130,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(tapScale, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Fill animation
    Animated.timing(fillAmount, {
      toValue: next ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // we animate fill colour, which doesn't support native driver
    }).start();

    try {
      await toggleFavorite(meditation.id);
    } catch (e) {
      // Roll back on error — rare, but possible if AsyncStorage fails.
      console.warn('toggleFavorite failed:', e);
      setFavorited(!next);
      fillAmount.setValue(next ? 0 : 1);
    }
  };

  // Animated fill colour: transparent when hollow, theme accent when full.
  const fillColor = fillAmount.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(245,198,120,0)', 'rgba(245,198,120,1)'],
  });

  // Slightly amplified glow when filled.
  const glowOpacity = fillAmount.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { opacity, transform: [{ scale: tapScale }] },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onPress}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        style={styles.pressable}
        accessibilityRole="button"
        accessibilityLabel={favorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        {/* Glow halo — visible only when filled */}
        <Animated.View
          pointerEvents="none"
          style={[styles.glow, { opacity: glowOpacity }]}
        />

        {/* Heart icon — outline always visible at low opacity, fill animates */}
        <Svg width={HEART_DRAW_SIZE} height={HEART_DRAW_SIZE} viewBox={HEART_VIEWBOX}>
          {/* Animated fill underneath — uses interpolated colour */}
          <AnimatedPath
            d={HEART_PATH}
            fill={fillColor as unknown as string}
          />
          {/* Outline on top so the stroke stays clean regardless of fill */}
          <Path
            d={HEART_PATH}
            stroke={theme.accent}
            strokeOpacity={0.85}
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="transparent"
          />
        </Svg>
      </Pressable>
    </Animated.View>
  );
}

// Animated wrapper for SVG Path so we can animate the fill colour.
const AnimatedPath = Animated.createAnimatedComponent(Path);

const styles = StyleSheet.create({
  wrapper: {
    // Parent positions us; we lay out as an inline-ish 0-margin block.
    alignSelf: 'center',
    width: HEART_DRAW_SIZE + 24,
    height: HEART_DRAW_SIZE + 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressable: {
    width: HEART_DRAW_SIZE + 24,
    height: HEART_DRAW_SIZE + 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: HEART_DRAW_SIZE + 24,
    height: HEART_DRAW_SIZE + 24,
    borderRadius: (HEART_DRAW_SIZE + 24) / 2,
    backgroundColor: 'rgba(245,198,120,0.18)',
    // Soft outer halo via shadow on iOS / elevation isn't quite the same on Android,
    // so we double up with a subtle bg.
    shadowColor: theme.accent,
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
});
