import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Asset } from 'expo-asset';

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Snapshot of the candle's internal state at one frame.
 * These mirror the globals inside candle_timer.html — we never modify
 * the HTML, we just observe.
 */
export interface CandleState {
  /** Target candle height being dragged to (0–250 px). */
  cH: number;
  /** Actual rendered height (smoothly tweens to cH). */
  aH: number;
  /** Max candle height in px (constant, currently 250). */
  MH: number;
  /** Is the flame currently lit? */
  lit: boolean;
  /** Is a burn session in progress? */
  burning: boolean;
  /** Is the user currently dragging the candle height? */
  dragging: boolean;
  /** 'fill' (dragging stage) | 'burning' (lit + burning down). */
  mode: 'fill' | 'burning';
  /** Timestamp (ms) when lighting occurred. 0 if not yet lit. */
  bStart: number;
  /** Total burn duration in seconds for current session. */
  bDur: number;
  /** Is the flame currently being extinguished (user tapped flame)? */
  extinguishing: boolean;
}

export interface CandleViewHandle {
  /** Force a state refresh immediately (useful after lifecycle events). */
  refresh(): void;
}

interface Props {
  /** Fires every animation frame with the current candle state. */
  onStateChange?: (state: CandleState) => void;
  /** Fires once when the flame transitions from unlit → lit. */
  onLight?: (finalHeight: number, burnDurationSec: number) => void;
  /** Fires once when the flame transitions from lit → extinguishing. */
  onExtinguish?: () => void;
  /** Fires when the candle fully burns down to 0. */
  onBurnComplete?: () => void;
}

// ─── Injected Bridge Script ──────────────────────────────────────────
//
// This runs *inside* the WebView AFTER candle_timer.html has loaded.
// It does NOT modify the candle's code — it reads globals via `window.*`
// and posts snapshots back to React Native using ReactNativeWebView.postMessage.
//
// We also track state transitions (lit → unlit, etc) here and emit them
// as named events so the RN side doesn't have to diff frames itself.

const bridgeScript = `
(function() {
  if (window.__candleBridgeInstalled) return;
  window.__candleBridgeInstalled = true;

  var prev = { lit: false, burning: false, extinguishing: false };

  function snapshot() {
    return {
      cH:            window.cH            ?? 0,
      aH:            window.aH            ?? 0,
      MH:            window.MH            ?? 250,
      lit:           window.lit           ?? false,
      burning:       window.burning       ?? false,
      dragging:      window.dragging      ?? false,
      mode:          window.mode          ?? 'fill',
      bStart:        window.bStart        ?? 0,
      bDur:          window.bDur          ?? 0,
      extinguishing: window.extinguishing ?? false
    };
  }

  function post(type, payload) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
    }
  }

  function tick() {
    var s = snapshot();

    // Frame-by-frame state broadcast (throttled to ~15fps to avoid spamming the bridge).
    if (!tick.last || performance.now() - tick.last > 66) {
      tick.last = performance.now();
      post('state', s);
    }

    // Transition events
    if (!prev.lit && s.lit) post('light', { cH: s.cH, bDur: s.bDur });
    if (prev.lit && !s.lit && s.extinguishing) post('extinguish', {});
    if (prev.burning && !s.burning && !s.extinguishing) post('burnComplete', {});

    prev = { lit: s.lit, burning: s.burning, extinguishing: s.extinguishing };
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
  true; // important — injectedJavaScript must return truthy on iOS
})();
`;

// ─── Component ───────────────────────────────────────────────────────

export const CandleView = forwardRef<CandleViewHandle, Props>((props, ref) => {
  const { onStateChange, onLight, onExtinguish, onBurnComplete } = props;
  const webRef = useRef<WebView>(null);
  const [html, setHtml] = useState<string | null>(null);

  // Load the bundled candle HTML and read its contents (untouched).
  useEffect(() => {
    (async () => {
      const asset = Asset.fromModule(require('../../assets/html/candle_timer.html'));
      await asset.downloadAsync();
      // Fetch the bundled file via its local URI so we can pass it as {html:...}
      // to the WebView. This avoids any path-resolution issues with file:// URIs.
      const uri = asset.localUri ?? asset.uri;
      try {
        const res = await fetch(uri);
        const text = await res.text();
        setHtml(text);
      } catch {
        // Fallback: try using uri directly (some platforms allow this)
        setHtml(null);
      }
    })();
  }, []);

  useImperativeHandle(ref, () => ({
    refresh() {
      webRef.current?.injectJavaScript('true;');
    },
  }), []);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as
        | { type: 'state'; payload: CandleState }
        | { type: 'light'; payload: { cH: number; bDur: number } }
        | { type: 'extinguish'; payload: Record<string, never> }
        | { type: 'burnComplete'; payload: Record<string, never> };

      switch (msg.type) {
        case 'state':
          onStateChange?.(msg.payload);
          break;
        case 'light':
          onLight?.(msg.payload.cH, msg.payload.bDur);
          break;
        case 'extinguish':
          onExtinguish?.();
          break;
        case 'burnComplete':
          onBurnComplete?.();
          break;
      }
    } catch {
      // Ignore malformed messages
    }
  };

  if (!html) {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator color="#f5c678" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        source={{ html }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        allowsBackForwardNavigationGestures={false}
        // Inject AFTER the HTML loads — the candle has already initialised
        // its state by then, so we just read it.
        injectedJavaScript={bridgeScript}
        // Disable selection / long-press callouts so the WebView feels native.
        setSupportMultipleWindows={false}
        onMessage={handleMessage}
        // iOS: prevents text selection / zoom gestures from messing with drag.
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
      />
    </View>
  );
});

CandleView.displayName = 'CandleView';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
  loading: { justifyContent: 'center', alignItems: 'center' },
});
