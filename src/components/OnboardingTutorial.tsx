import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated, Easing, Dimensions, SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';

import { NightSkyBackground } from './NightSkyBackground';
import { theme } from '../config/theme';

// ─── OnboardingTutorial ──────────────────────────────────────────────
//
// A short, three-screen sequential tutorial shown once on first launch.
// Persisted via AsyncStorage so a returning user is never bothered with
// it again.
//
//   1. Welcome  — brand introduction, fade-in over the starfield
//   2. Candle   — illustrated candle + animated hand drag, explains
//                 the central interaction
//   3. Moon     — pulsing moon button + explanation of the menu
//
// Visual language matches the rest of the app:
//   • starfield + dim moon backdrop (same as MenuSheet)
//   • Georgia serif for emphasis text, system sans for body
//   • thin amber accents, soft glows, slow easing
//   • forward-only — no Back button, no skip (it's only 3 screens)

const { width: WINDOW_W, height: WINDOW_H } = Dimensions.get('window');

const STORAGE_KEY = '@onboarding_tutorial_complete_v1';

interface Props {
  /**
   * Called when the tutorial finishes. Parent unmounts the component and
   * shows the home screen.
   */
  onComplete: () => void;
}

export function OnboardingTutorial({ onComplete }: Props) {
  const [step, setStep] = useState(0);

  // Cross-fade between steps
  const stepOpacity = useRef(new Animated.Value(0)).current;
  const stepShift = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Initial fade-in for step 0; subsequent steps animate via handleNext
    Animated.parallel([
      Animated.timing(stepOpacity, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(stepShift, {
        toValue: 0,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [stepOpacity, stepShift]);

  const handleNext = async () => {
    // Fade current step out
    await new Promise<void>((resolve) => {
      Animated.parallel([
        Animated.timing(stepOpacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(stepShift, {
          toValue: -20,
          duration: 350,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => resolve());
    });

    if (step >= 2) {
      // Tutorial finished
      try {
        await AsyncStorage.setItem(STORAGE_KEY, 'true');
      } catch {
        // Non-fatal — user will just see it again next launch.
      }
      onComplete();
      return;
    }

    // Reset for next step
    stepShift.setValue(20);
    setStep((s) => s + 1);

    Animated.parallel([
      Animated.timing(stepOpacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(stepShift, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Persistent starry backdrop — does NOT cross-fade between steps,
          so the world stays continuous as the foreground content swaps. */}
      <NightSkyBackground />

      {/* Foreground: only the active step is rendered, transitioning via
          opacity + a small upward shift. */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: stepOpacity, transform: [{ translateY: stepShift }] },
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          {step === 0 && <WelcomeStep />}
          {step === 1 && <CandleStep />}
          {step === 2 && <MoonStep />}

          <View style={styles.footer}>
            <StepDots active={step} count={3} />
            <ContinueButton
              label={step === 2 ? 'Begin' : 'Continue'}
              onPress={handleNext}
            />
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

/**
 * Reads the persisted completion flag. App.tsx uses this to decide
 * whether to render the tutorial or the home screen on launch.
 */
export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    return v === 'true';
  } catch {
    return false;
  }
}

// ─── Step 1: Welcome ─────────────────────────────────────────────────

function WelcomeStep() {
  return (
    <View style={styles.stepBody}>
      <View style={styles.welcomeBlock}>
        <Text style={styles.brandTitle}>Glimmer</Text>
        <View style={styles.brandRule} />
        <Text style={styles.brandSubtitle}>
          A candle. A bell. A voice.
        </Text>
        <Text style={styles.brandTag}>
          The simplest, best, free meditation ever.
        </Text>
        <Text style={styles.brandEnjoy}>Enjoy.</Text>
      </View>
    </View>
  );
}

// ─── Step 2: Candle ──────────────────────────────────────────────────

function CandleStep() {
  // Illustrated candle that grows on a loop, with a ghost hand sliding
  // upward to show the gesture. (We don't show a flame in this preview —
  // the user will see the real one in the app the first time they sit.)
  const candleHeight = useRef(new Animated.Value(0)).current;
  const handY = useRef(new Animated.Value(0)).current;
  const handOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        // Hand appears at bottom
        Animated.timing(handOpacity, {
          toValue: 0.7,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Hand moves up + candle grows in lockstep
        Animated.parallel([
          Animated.timing(handY, {
            toValue: -110,
            duration: 1700,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(candleHeight, {
            toValue: 1,
            duration: 1700,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: false, // height isn't native-drivable
          }),
        ]),
        // Hand releases (fades)
        Animated.timing(handOpacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Hold for a beat
        Animated.delay(900),
        // Candle resets for the next loop
        Animated.timing(candleHeight, {
          toValue: 0,
          duration: 600,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
        }),
        // Hand resets to bottom (invisible during reset)
        Animated.timing(handY, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(500),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [candleHeight, handY, handOpacity]);

  // Candle dimensions
  const CANDLE_BASE_W = 36;
  const CANDLE_MAX_H = 130;
  const candleH = candleHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [10, CANDLE_MAX_H],
  });

  return (
    <View style={styles.stepBody}>
      <View style={styles.candleStage}>
        {/* Candle holder — small brass cup */}
        <View style={candleStyles.holder} />

        {/* Candle body — animated height */}
        <Animated.View
          style={[
            candleStyles.candle,
            {
              height: candleH,
              width: CANDLE_BASE_W,
            },
          ]}
        />

        {/* Animated ghost hand pulling upward — a simple SVG outline */}
        <Animated.View
          pointerEvents="none"
          style={[
            candleStyles.hand,
            {
              opacity: handOpacity,
              transform: [{ translateY: handY }],
            },
          ]}
        >
          <Svg width={48} height={48} viewBox="0 0 48 48">
            <Path
              d="M 18 28 L 18 12 Q 18 9 21 9 Q 24 9 24 12 L 24 22 L 24 10 Q 24 7 27 7 Q 30 7 30 10 L 30 23 L 30 12 Q 30 9 33 9 Q 36 9 36 12 L 36 26 L 36 16 Q 36 13 39 13 Q 42 13 42 16 L 42 32 Q 42 42 32 42 L 24 42 Q 16 42 14 34 L 12 28 Q 10 24 14 22 Q 18 22 18 28 Z"
              stroke={theme.accent}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.85}
            />
          </Svg>
        </Animated.View>
      </View>

      <View style={styles.copyBlock}>
        <Text style={styles.copyTitle}>Drag the candle</Text>
        <Text style={styles.copyBody}>
          Drag upward to set how long you'd like to sit.{'\n'}
          Release — the candle lights itself.
        </Text>
      </View>
    </View>
  );
}

const candleStyles = StyleSheet.create({
  holder: {
    position: 'absolute',
    bottom: 60,
    width: 64,
    height: 18,
    borderRadius: 6,
    backgroundColor: '#7a5a18',
    shadowColor: '#cca44c',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  candle: {
    position: 'absolute',
    bottom: 78,
    backgroundColor: '#f0e5cc',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    shadowColor: '#ffeccf',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  hand: {
    position: 'absolute',
    bottom: 30,
    right: '50%',
    marginRight: -70,
  },
});

// ─── Step 3: Moon ────────────────────────────────────────────────────

function MoonStep() {
  // Pulsing concentric rings around an SVG moon — same crescent path
  // used by the actual MoonButton, scaled up for the tutorial.
  const RING_COUNT = 3;
  const ringScales = useRef(
    Array.from({ length: RING_COUNT }, () => new Animated.Value(0)),
  ).current;
  const ringOpacities = useRef(
    Array.from({ length: RING_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const loops = ringScales.map((scale, i) => {
      const op = ringOpacities[i];
      const cycle = Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1,
            duration: 2400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(op, {
            toValue: 0.5,
            duration: 350,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(op, {
            toValue: 0,
            duration: 2050,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]);
      const loop = Animated.loop(cycle);
      const timer = setTimeout(() => loop.start(), i * 800);
      return { loop, timer };
    });
    return () => {
      loops.forEach(({ loop, timer }) => {
        clearTimeout(timer);
        loop.stop();
      });
    };
  }, [ringScales, ringOpacities]);

  const MOON_PATH =
    'M3.32031 11.6835C3.32031 16.6541 7.34975 20.6835 12.3203 20.6835C16.1075 20.6835 19.3483 18.3443 20.6768 15.032C19.6402 15.4486 18.5059 15.6834 17.3203 15.6834C12.3497 15.6834 8.32031 11.654 8.32031 6.68342C8.32031 5.50338 8.55165 4.36259 8.96453 3.32996C5.65605 4.66028 3.32031 7.89912 3.32031 11.6835Z';
  const MOON_SIZE = 84;
  const MAX_RING = 140;

  return (
    <View style={styles.stepBody}>
      <View style={styles.moonStage}>
        {/* Pulse rings */}
        {ringScales.map((scale, i) => (
          <Animated.View
            key={i}
            style={[
              moonStyles.ring,
              {
                width: MAX_RING * 2,
                height: MAX_RING * 2,
                borderRadius: MAX_RING,
                marginLeft: -MAX_RING,
                marginTop: -MAX_RING,
                opacity: ringOpacities[i],
                transform: [{ scale }],
              },
            ]}
          />
        ))}

        {/* The moon itself */}
        <Svg width={MOON_SIZE} height={MOON_SIZE} viewBox="0 0 24 24" fill="none">
          <Path
            d={MOON_PATH}
            stroke={theme.accent}
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          />
        </Svg>
      </View>

      <View style={styles.copyBlock}>
        <Text style={styles.copyTitle}>Tap the moon</Text>
        <Text style={styles.copyBody}>
          A small moon waits in the upper corner.{'\n'}
          Tap it any time for your favorites, your practice, and more.
        </Text>
      </View>
    </View>
  );
}

const moonStyles = StyleSheet.create({
  ring: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderWidth: 1,
    borderColor: theme.accent,
  },
});

// ─── Common pieces: dots + button ────────────────────────────────────

function StepDots({ active, count }: { active: number; count: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i === active && dotStyles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.textFaint,
    opacity: 0.6,
    marginHorizontal: 5,
  },
  dotActive: {
    backgroundColor: theme.accent,
    opacity: 0.95,
    width: 22,
  },
});

interface ContinueButtonProps {
  label: string;
  onPress: () => void;
}

function ContinueButton({ label, onPress }: ContinueButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        buttonStyles.button,
        pressed && buttonStyles.buttonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={buttonStyles.label}>{label}</Text>
    </Pressable>
  );
}

const buttonStyles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    paddingHorizontal: 56,
    paddingVertical: 16,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.accentSoft,
    borderWidth: 1,
    borderColor: theme.accent,
  },
  buttonPressed: {
    backgroundColor: theme.surfaceHi,
    transform: [{ scale: 0.97 }],
  },
  label: {
    color: theme.accent,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

// ─── Shared layout ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  stepBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  footer: {
    paddingBottom: 32,
    paddingHorizontal: 32,
  },

  // Welcome step
  welcomeBlock: {
    alignItems: 'center',
  },
  brandTitle: {
    color: theme.text,
    fontSize: 56,
    fontFamily: 'Georgia',
    fontWeight: '300',
    letterSpacing: 6,
    marginBottom: 14,
    textShadowColor: 'rgba(245,198,120,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  brandRule: {
    width: 44,
    height: 1,
    backgroundColor: theme.accent,
    opacity: 0.55,
    marginBottom: 24,
  },
  brandSubtitle: {
    color: theme.accent,
    fontSize: 17,
    fontFamily: 'Georgia',
    fontWeight: '300',
    fontStyle: 'italic',
    letterSpacing: 1.2,
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 18,
  },
  brandTag: {
    color: theme.textDim,
    fontSize: 14,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  brandEnjoy: {
    color: theme.accent,
    fontSize: 16,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontWeight: '300',
    letterSpacing: 1.5,
    opacity: 0.85,
    textAlign: 'center',
    marginTop: 22,
  },

  // Candle / moon stages — vertical demo zone above the copy
  candleStage: {
    width: 240,
    height: 280,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 48,
  },
  moonStage: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },

  copyBlock: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  copyTitle: {
    color: theme.text,
    fontSize: 22,
    fontFamily: 'Georgia',
    fontWeight: '300',
    letterSpacing: 2,
    marginBottom: 14,
    textAlign: 'center',
  },
  copyBody: {
    color: theme.textDim,
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
