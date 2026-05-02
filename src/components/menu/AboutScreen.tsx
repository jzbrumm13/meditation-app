import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { theme } from '../../config/theme';
import { resetStats } from '../../services/sessionStats';
import { clearFavorites } from '../../services/favorites';
import {
  getSupportProduct,
  contributeToRunningCosts,
  isContributionSupported,
  EXPO_GO_UNSUPPORTED,
  SupportProduct,
} from '../../services/tipJar';

// ─── AboutScreen ─────────────────────────────────────────────────────
//
// Credits, voice acknowledgment, version number, and the reset-data
// controls. Intentionally spare — meditation apps shouldn't feel like
// corporate software. Short paragraphs, wide line-height, plenty of
// breathing room. The reset controls live at the bottom and use the
// same low-key visual weight as the rest of the page so they don't
// dominate; users who need them will find them.

const APP_VERSION = '1.0.0';

export function AboutScreen() {
  // Brief inline acknowledgement after a reset. Replaces the button label
  // for ~2.5s so the user gets confirmation without a popup.
  const [statsResetMsg, setStatsResetMsg] = useState(false);
  const [favsResetMsg, setFavsResetMsg] = useState(false);

  // ─── Running-costs contribution (StoreKit IAP) ────────────────────
  // Fetched lazily once the user reaches About. Three meaningful states:
  //   product === null + loading        → "Loading…"
  //   product === null + !loading       → either unsupported (Expo Go) or fetch failed
  //   product !== null                  → show price + button
  // Plus the transient `purchasing` and `thanked` states.
  const [product, setProduct] = useState<SupportProduct | null>(null);
  const [productError, setProductError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [thanked, setThanked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!isContributionSupported()) {
      // Expo Go / non-iOS — show a friendly note rather than a busted button.
      setProductError(EXPO_GO_UNSUPPORTED);
      return;
    }
    (async () => {
      try {
        const p = await getSupportProduct();
        if (!cancelled) setProduct(p);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown';
        if (!cancelled) setProductError(msg);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleContribute = async () => {
    if (!product || purchasing) return;
    setPurchasing(true);
    try {
      const ok = await contributeToRunningCosts();
      if (ok) {
        setThanked(true);
        // Linger for a few seconds so the user sees the acknowledgement,
        // then quietly reset so they could contribute again later.
        setTimeout(() => setThanked(false), 6000);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Could not complete', msg);
    } finally {
      setPurchasing(false);
    }
  };

  const confirmResetStats = () => {
    Alert.alert(
      'Reset stats?',
      'Your streak, total sessions, and total minutes will be erased. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetStats();
            setStatsResetMsg(true);
            setTimeout(() => setStatsResetMsg(false), 2500);
          },
        },
      ],
    );
  };

  const confirmClearFavorites = () => {
    Alert.alert(
      'Clear favorites?',
      'Your hearted meditations will be erased. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearFavorites();
            setFavsResetMsg(true);
            setTimeout(() => setFavsResetMsg(false), 2500);
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>About</Text>

      <Text style={styles.paragraph}>
        A candle. A bell. A voice.
      </Text>
      <Text style={styles.paragraph}>
        The app was built around a single idea: a meditation timer should get out of
        your way. There are no tabs, no libraries, no scoreboards. You drag a candle
        to the length you can sit for, you release, and you sit until the flame
        finishes.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Voice</Text>
        <Text style={styles.paragraph}>
          Voice rendering by ElevenLabs Voice Design. The narration style is a slow,
          unhurried delivery in the tradition of the great nature documentaries.
          All scripts are original.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Influences</Text>
        <Text style={styles.paragraph}>
          The pointing style draws on nondual teachers — Rupert Spira, Loch Kelly,
          Adyashanti among others — alongside classical breath-anchored mindfulness.
          Any errors or oversimplifications are the author's.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Privacy</Text>
        <Text style={styles.paragraph}>
          Nothing you do in this app leaves your device, except the sound files
          streaming from their server. No account, no analytics, no tracking.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Reset</Text>
        <Text style={styles.paragraph}>
          Erase your local data if you'd like to start fresh.
        </Text>

        <Pressable
          onPress={confirmResetStats}
          style={({ pressed }) => [styles.resetRow, pressed && styles.resetRowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Reset stats"
        >
          <Text style={styles.resetLabel}>
            {statsResetMsg ? 'Stats cleared' : 'Reset stats'}
          </Text>
          <Text style={styles.resetHint}>Streak, sessions, minutes</Text>
        </Pressable>

        <Pressable
          onPress={confirmClearFavorites}
          style={({ pressed }) => [styles.resetRow, pressed && styles.resetRowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Clear favorites"
        >
          <Text style={styles.resetLabel}>
            {favsResetMsg ? 'Favorites cleared' : 'Clear favorites'}
          </Text>
          <Text style={styles.resetHint}>Hearted meditations</Text>
        </Pressable>
      </View>

      {/*
        Running-costs section. Deliberately placed AFTER reset so it doesn't
        front-load asks; users who scrolled this far have read the credits
        and the privacy note. Tone is strictly functional — this is about
        keeping the audio servers on, not supporting the developer.
      */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Running costs</Text>
        <Text style={styles.paragraph}>
          Glimmer's audio files are hosted on a server that costs a small amount
          each month to run. If the app's been useful and you'd like to help
          cover those costs, you can contribute below.
        </Text>
        <Text style={styles.paragraphFaint}>
          Strictly optional. The app stays free either way.
        </Text>

        {/* Three render branches: thanked → ack only; ready → button; otherwise → status */}
        {thanked ? (
          <View style={styles.contributeRow}>
            <Text style={styles.thankYou}>Thank you.</Text>
          </View>
        ) : product ? (
          <Pressable
            onPress={handleContribute}
            disabled={purchasing}
            style={({ pressed }) => [
              styles.contributeRow,
              pressed && styles.resetRowPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Contribute ${product.price}`}
          >
            <Text style={styles.contributeLabel}>
              Help keep Glimmer running
            </Text>
            <Text style={styles.contributePrice}>
              {purchasing ? 'Loading…' : product.price}
            </Text>
          </Pressable>
        ) : productError === EXPO_GO_UNSUPPORTED ? (
          <View style={styles.contributeRow}>
            <Text style={styles.contributeHint}>
              Available in production builds only.
            </Text>
          </View>
        ) : productError ? (
          <View style={styles.contributeRow}>
            <Text style={styles.contributeHint}>
              Couldn't reach the App Store. Try again in a moment.
            </Text>
          </View>
        ) : (
          // Loading state — neutral, no spinner so it doesn't pull focus.
          <View style={styles.contributeRow}>
            <ActivityIndicator size="small" color={theme.textFaint} />
          </View>
        )}
      </View>

      <View style={styles.versionBlock}>
        <Text style={styles.versionText}>Version {APP_VERSION}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 60,
  },
  heading: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 2,
    color: theme.text,
    marginBottom: 32,
  },
  section: {
    marginTop: 28,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 3,
    color: theme.accent,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: theme.textDim,
    lineHeight: 24,
    letterSpacing: 0.2,
    marginBottom: 14,
  },
  // Reset rows: thin underlined rows with a hairline separator. Pressed
  // state dims the whole row. Visual weight matches the rest of the page —
  // nothing pulls focus, but the controls are easy to find when needed.
  resetRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.textFaint,
  },
  resetRowPressed: {
    opacity: 0.5,
  },
  resetLabel: {
    fontSize: 15,
    color: theme.text,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  resetHint: {
    fontSize: 12,
    color: theme.textFaint,
    letterSpacing: 0.5,
  },
  // Even fainter paragraph for the "strictly optional" caveat — visually
  // de-prioritises the request rather than reinforcing it.
  paragraphFaint: {
    fontSize: 13,
    color: theme.textFaint,
    lineHeight: 22,
    letterSpacing: 0.2,
    marginBottom: 18,
  },
  // The contribution row uses the same hairline rhythm as the reset rows
  // above so it doesn't visually shout. Label left, price right.
  contributeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.textFaint,
  },
  contributeLabel: {
    fontSize: 15,
    color: theme.text,
    letterSpacing: 0.3,
  },
  contributePrice: {
    fontSize: 14,
    color: theme.accent,
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  contributeHint: {
    fontSize: 13,
    color: theme.textFaint,
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
  thankYou: {
    fontSize: 15,
    color: theme.accent,
    letterSpacing: 0.5,
    flex: 1,
  },
  versionBlock: {
    marginTop: 48,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: theme.textFaint,
    letterSpacing: 1.5,
  },
});
