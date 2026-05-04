import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { theme } from '../../config/theme';
import { resetStats } from '../../services/sessionStats';
import { clearFavorites } from '../../services/favorites';

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
