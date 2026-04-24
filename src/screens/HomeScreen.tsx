import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, StyleSheet, Text, Animated, Easing,
  LayoutChangeEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

import { CandleView, CandleState } from '../components/CandleView';
import { MoonButton } from '../components/MoonButton';
import { MenuSheet } from '../components/MenuSheet';
import { ShootingStar } from '../components/ShootingStar';
import { theme } from '../config/theme';
import { Tier, tierForCandleHeight } from '../config/tiers';
import { pickRandomForTier } from '../services/meditations';
import { recordSession } from '../services/sessionStats';
import * as player from '../services/audioPlayer';

// ─── Candle canvas geometry ──────────────────────────────────────────
// These mirror the constants at the top of candle_timer.html. They
// describe the 500x700 canvas that the HTML draws into. We use them
// to project the candle's canvas-space coordinates onto screen-space
// for overlays (like the golden snap number beside the candle).
const CANVAS_W = 500;
const CANVAS_H = 700;
const CANVAS_CX = CANVAS_W / 2;
const CANVAS_BY = 520; // base of the candle in canvas coords
const CANVAS_MH = 250; // max candle height in canvas px

// ─── Component ───────────────────────────────────────────────────────

export function HomeScreen() {
  // Candle state (mirrored from the WebView each frame)
  const [candle, setCandle] = useState<CandleState | null>(null);

  // WebView layout — needed to project canvas coords onto screen coords
  const [webViewW, setWebViewW] = useState(0);
  const [webViewH, setWebViewH] = useState(0);

  // Menu sheet visibility (opened by the moon button)
  const [menuOpen, setMenuOpen] = useState(false);

  // Haptic ticking as the user crosses snap boundaries
  const lastSnapH = useRef<number>(0);

  // Active session's tier minutes — set when the candle lights, consumed on
  // natural burn-complete (NOT on early extinguish — only completed sits count).
  const activeTierMinutesRef = useRef<number | null>(null);

  // Fade animations
  const numberOpacity = useRef(new Animated.Value(0)).current;
  const numberShownRef = useRef(false);

  // ─── Candle event handlers ─────────────────────────────────────────

  const onCandleState = useCallback((s: CandleState) => {
    setCandle(s);

    // Haptic tick when the candle jumps to a new snap height during drag.
    if (s.dragging && s.mode === 'fill') {
      if (Math.abs(s.cH - lastSnapH.current) > 2) {
        lastSnapH.current = s.cH;
        if (s.cH > 0) {
          Haptics.selectionAsync().catch(() => {});
        }
      }
    }

    // Show the golden snap-number while the user is actively dragging
    // and has pulled the candle past the ignition threshold.
    const shouldShow = s.dragging && s.mode === 'fill' && s.cH > 0;
    if (shouldShow !== numberShownRef.current) {
      numberShownRef.current = shouldShow;
      Animated.timing(numberOpacity, {
        toValue: shouldShow ? 1 : 0,
        duration: shouldShow ? 180 : 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [numberOpacity]);

  const onLight = useCallback(async (finalHeight: number, _bDur: number) => {
    const tier = tierForCandleHeight(finalHeight);
    if (!tier) return;

    // Remember this session's length so onBurnComplete can record it.
    activeTierMinutesRef.current = tier.minutes;

    // Haptic tap when the flame catches.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Auto-pick and play a random meditation matching the candle's length.
    try {
      const m = await pickRandomForTier(tier);
      if (m) {
        await player.play(m);
      }
    } catch (e) {
      console.warn('Auto-play failed:', e);
    }
  }, []);

  const onExtinguish = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    player.stop();
    // Early exit — session doesn't count toward streak/totals.
    activeTierMinutesRef.current = null;
  }, []);

  const onBurnComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    player.stop();

    // Record the completed session. Only natural burn-complete counts.
    const minutes = activeTierMinutesRef.current;
    if (minutes && minutes > 0) {
      recordSession(minutes).catch(e => console.warn('recordSession failed:', e));
    }
    activeTierMinutesRef.current = null;
  }, []);

  // ─── Audio session setup (once) ────────────────────────────────────

  useEffect(() => {
    player.configureAudioSession().catch(e => console.warn('Audio session setup failed:', e));
    return () => { player.stop(); };
  }, []);

  // ─── Project canvas coords → screen coords ─────────────────────────
  // The candle's 500x700 canvas is scaled to fit the WebView with
  // `max-width:100vw; max-height:100vh` and centered in a flexbox.

  const onWebViewLayout = useCallback((e: LayoutChangeEvent) => {
    setWebViewW(e.nativeEvent.layout.width);
    setWebViewH(e.nativeEvent.layout.height);
  }, []);

  const scale = webViewW > 0 && webViewH > 0
    ? Math.min(webViewW / CANVAS_W, webViewH / CANVAS_H)
    : 0;
  const canvasDisplayW = CANVAS_W * scale;
  const canvasDisplayH = CANVAS_H * scale;
  const canvasLeft = (webViewW - canvasDisplayW) / 2;
  const canvasTop = (webViewH - canvasDisplayH) / 2;

  // Y position of the top of the candle in screen coords.
  const candleTopY = candle
    ? canvasTop + (CANVAS_BY - candle.aH) * scale
    : 0;
  // Center of the candle in screen coords.
  const candleCenterX = canvasLeft + CANVAS_CX * scale;

  // Compute the minutes value to show, based on the current *target* snap.
  // cH is already snapped in the candle HTML so this is a clean lookup.
  const dragTier: Tier | null = candle ? tierForCandleHeight(candle.cH) : null;

  // Moon button shows whenever the candle is NOT actively in-session.
  // That means it reappears as soon as the flame goes out — the smoke +
  // ember animation still plays, but the moon is visible again during
  // that wind-down, because the session itself is already over.
  const moonVisible = !!candle
    && !candle.dragging
    && !candle.lit
    && !candle.burning;

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Candle fills the screen */}
      <View style={styles.candleContainer} onLayout={onWebViewLayout}>
        <CandleView
          onStateChange={onCandleState}
          onLight={onLight}
          onExtinguish={onExtinguish}
          onBurnComplete={onBurnComplete}
        />
      </View>


      {/*
        Floating soft snap-number — appears to the LEFT of the candle during
        drag, showing the meditation length (in minutes) at the current snap.
        Intentionally discreet: softer weight, muted glow, low opacity.
      */}
      {scale > 0 && dragTier && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.dragNumber,
            {
              opacity: numberOpacity,
              // Position to the LEFT of the candle — right-align the text
              // up against an anchor just left of the candle body.
              right: undefined,
              width: 80,
              left: candleCenterX - 44 * scale - 80,
              top: candleTopY - 12,
            },
          ]}
        >
          <Text style={styles.dragNumberValue}>{dragTier.minutes}</Text>
        </Animated.View>
      )}

      {/* Rare shooting star across the upper sky. Fires every 3–5 minutes,
          including during meditation. Self-contained — no props needed. */}
      <ShootingStar />

      {/* Discreet moon button — disappears the moment user engages with candle */}
      <MoonButton visible={moonVisible} onPress={() => setMenuOpen(true)} />

      {/* Menu sheet (Favorites / Settings / Support) */}
      <MenuSheet visible={menuOpen} onDismiss={() => setMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  candleContainer: { flex: 1, backgroundColor: theme.bg },

  dragNumber: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
  },
  dragNumberValue: {
    color: theme.accent,
    fontSize: 26,
    fontWeight: '200',                 // ultra-light for a softer presence
    fontFamily: 'Georgia',             // soft serif — reads quieter than system sans
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],     // digits don't jiggle as they change
    opacity: 0.65,                     // muted, not shouting
    // Gentle halo rather than bright flame-light.
    textShadowColor: 'rgba(245,198,120,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
