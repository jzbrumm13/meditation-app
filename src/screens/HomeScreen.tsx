import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, StyleSheet, Text, Animated, Easing,
  LayoutChangeEvent, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

import { CandleView, CandleState, CandleViewHandle } from '../components/CandleView';
import { MoonButton } from '../components/MoonButton';
import { MenuSheet } from '../components/MenuSheet';
import { ShootingStar } from '../components/ShootingStar';
import { FavoriteHeart } from '../components/FavoriteHeart';
import { theme } from '../config/theme';
import { Tier, tierForCandleHeight } from '../config/tiers';
import { pickRandomForTier, Meditation } from '../services/meditations';
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

  // Imperative handle on the WebView so the Favorites flow can light the
  // candle programmatically.
  const candleRef = useRef<CandleViewHandle>(null);

  // The most recently played meditation — exposed to the FavoriteHeart so
  // the user can heart what they just listened to during the wind-down.
  const [lastPlayed, setLastPlayed] = useState<Meditation | null>(null);

  // True while the candle is in its post-session reset phase (smoking,
  // ember-glow, fading back to "fill" mode). Drives the FavoriteHeart fade.
  const [heartVisible, setHeartVisible] = useState(false);

  // Pending meditation — set by the Favorites flow before lighting the
  // candle programmatically. onLight consumes this in place of a random pick.
  const pendingMeditationRef = useRef<Meditation | null>(null);

  // True from the moment the flame catches until the audio file has finished
  // loading and started playing. On a cold cache this is the network-fetch +
  // decode window — usually 0.5–3 seconds. We surface a faint spinner so the
  // user knows audio is on its way and didn't silently fail.
  const [audioLoading, setAudioLoading] = useState(false);

  // Fade for the loading spinner so it doesn't pop in/out abruptly.
  const spinnerOpacity = useRef(new Animated.Value(0)).current;

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

    // A new sit started — hide the previous session's heart immediately.
    setHeartVisible(false);

    // Haptic tap when the flame catches.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // If a pending favorite is queued, play that instead of a random pick.
    const pending = pendingMeditationRef.current;
    pendingMeditationRef.current = null;

    try {
      const m = pending ?? (await pickRandomForTier(tier));
      if (m) {
        setLastPlayed(m);
        // Show the spinner during the load → first-frame-of-playback window.
        // play() resolves once the Sound has been created, decoded, and the
        // first chunk is buffering — so awaiting it is a reasonable proxy
        // for "audio is ready".
        setAudioLoading(true);
        try {
          await player.play(m);
        } finally {
          setAudioLoading(false);
        }
      }
    } catch (e) {
      setAudioLoading(false);
      console.warn('Auto-play failed:', e);
    }
  }, []);

  // The candle's full reset (smoke + ember fade-out → back to fill mode)
  // takes ~13s. We want the heart to appear roughly halfway through so it
  // doesn't crowd the immediate post-snuff moment, then linger a few
  // seconds after the candle has fully reset before fading.
  const HEART_FADE_IN_DELAY_MS = 6500;
  const HEART_FADE_OUT_DELAY_MS = 14500;

  const onExtinguish = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    player.stop();
    // Early exit — session doesn't count toward streak/totals.
    activeTierMinutesRef.current = null;

    // Show the heart partway through the wind-down so it appears as a
    // gentle afterglow rather than a UI prompt right at the snuff.
    setTimeout(() => setHeartVisible(true), HEART_FADE_IN_DELAY_MS);
    setTimeout(() => setHeartVisible(false), HEART_FADE_OUT_DELAY_MS);
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

    // Show the heart partway through the wind-down (same as user-snuff path).
    setTimeout(() => setHeartVisible(true), HEART_FADE_IN_DELAY_MS);
    setTimeout(() => setHeartVisible(false), HEART_FADE_OUT_DELAY_MS);
  }, []);

  // ─── Favorites: play a hearted meditation from the menu ────────────

  const handlePlayFavorite = useCallback((m: Meditation) => {
    // Close the menu so the candle becomes visible again.
    setMenuOpen(false);
    // Queue the meditation for onLight to consume instead of picking random.
    pendingMeditationRef.current = m;
    // Tiny delay so the menu's exit animation can begin before the candle
    // lights — without this the candle ignites behind a fading-out modal,
    // which feels less continuous.
    setTimeout(() => {
      candleRef.current?.lightWith(m.lengthMinutes);
    }, 280);
  }, []);

  // ─── Audio session setup (once) ────────────────────────────────────

  useEffect(() => {
    player.configureAudioSession().catch(e => console.warn('Audio session setup failed:', e));
    return () => { player.stop(); };
  }, []);

  // Fade the loading spinner in/out. Quick fade-in once the load is detectably
  // taking >250ms so we don't flash on cached files; gentle fade-out the
  // moment loading completes. Avoids any abrupt UI changes during the sit.
  useEffect(() => {
    if (audioLoading) {
      // Small delay before showing — most cached loads complete in <250ms,
      // so this avoids a flash on warm starts.
      const id = setTimeout(() => {
        Animated.timing(spinnerOpacity, {
          toValue: 0.45,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }, 250);
      return () => clearTimeout(id);
    } else {
      Animated.timing(spinnerOpacity, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [audioLoading, spinnerOpacity]);

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
          ref={candleRef}
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

      {/* Faint heart that appears below the candle during the post-session
          wind-down. Tapping it favorites the meditation that just played.
          Positioned just under the candle holder, in the lower portion of
          the screen so it's clearly disambiguated from the candle itself. */}
      {scale > 0 && (
        <View
          style={[
            styles.heartLayer,
            {
              top: canvasTop + 640 * scale,
            },
          ]}
          pointerEvents="box-none"
        >
          <FavoriteHeart meditation={lastPlayed} visible={heartVisible} />
        </View>
      )}

      {/* Faint loading spinner — appears for a beat after the flame catches
          while the audio is being loaded from network/cache, then fades out
          once playback starts. Positioned well below the candle so it sits
          quietly out of the meditator's primary focus. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.spinnerLayer, { opacity: spinnerOpacity }]}
      >
        <ActivityIndicator size="small" color={theme.accent} />
      </Animated.View>

      {/* Discreet moon button — disappears the moment user engages with candle */}
      <MoonButton visible={moonVisible} onPress={() => setMenuOpen(true)} />

      {/* Menu sheet (Favorites / Settings / Support) */}
      <MenuSheet
        visible={menuOpen}
        onDismiss={() => setMenuOpen(false)}
        onPlayFavorite={handlePlayFavorite}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  candleContainer: { flex: 1, backgroundColor: theme.bg },

  heartLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  // Audio loading spinner. Pinned to the lower portion of the screen,
  // far enough below the candle that it doesn't pull the eye during a sit.
  spinnerLayer: {
    position: 'absolute',
    bottom: 64,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

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
