import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../../config/theme';

// ─── AboutScreen ─────────────────────────────────────────────────────
//
// Credits, voice acknowledgment, version number.
// Intentionally spare — meditation apps shouldn't feel like corporate
// software. Short paragraphs, wide line-height, plenty of breathing room.

const APP_VERSION = '1.0.0';

export function AboutScreen() {
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
