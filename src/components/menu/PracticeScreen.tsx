import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { loadStats, SessionStats } from '../../services/sessionStats';
import { theme } from '../../config/theme';

// ─── PracticeScreen ──────────────────────────────────────────────────
//
// Read-only stats summary of the user's practice. Drives daily-habit
// formation without pushing gamification — no achievements, no badges,
// no celebratory fireworks. Just: here's what you've done.

function formatTotalTime(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours < 10) {
    return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
  }
  // For longer totals, round to hours — precision becomes noise
  return `${hours} hr`;
}

function formatLastSession(iso: string | null): string {
  if (!iso) return 'No sessions yet';
  const today = new Date();
  const d = new Date(iso + 'T00:00:00');
  const daysAgo = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  if (daysAgo < 7) return `${daysAgo} days ago`;
  return iso;
}

export function PracticeScreen() {
  const [stats, setStats] = useState<SessionStats | null>(null);

  useEffect(() => {
    loadStats().then(setStats).catch(() => setStats(null));
  }, []);

  if (!stats) {
    return <View style={styles.container} />;
  }

  const hasData = stats.totalSessions > 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Your Practice</Text>

      {!hasData ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Your practice will show here</Text>
          <Text style={styles.emptyBody}>
            After you complete your first meditation — when the candle burns all the
            way down and the bell rings — your stats will appear.
          </Text>
        </View>
      ) : (
        <View>
          {/* Current streak — the featured stat */}
          <View style={styles.featuredStat}>
            <Text style={styles.featuredValue}>{stats.currentStreak}</Text>
            <Text style={styles.featuredLabel}>
              {stats.currentStreak === 1 ? 'day' : 'days'} in a row
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Secondary stats — two columns */}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{stats.totalSessions}</Text>
              <Text style={styles.statLabel}>
                {stats.totalSessions === 1 ? 'session' : 'sessions'}
              </Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{formatTotalTime(stats.totalMinutes)}</Text>
              <Text style={styles.statLabel}>total time</Text>
            </View>
          </View>

          {/* Longest streak — quieter */}
          {stats.longestStreak > stats.currentStreak && (
            <Text style={styles.footNote}>
              Longest streak: {stats.longestStreak} days
            </Text>
          )}

          <Text style={styles.footNote}>
            Last sat: {formatLastSession(stats.lastSessionDate)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 2,
    color: theme.text,
    marginBottom: 48,
  },
  emptyState: {
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    color: theme.accent,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  emptyBody: {
    fontSize: 15,
    color: theme.textDim,
    lineHeight: 23,
    letterSpacing: 0.2,
  },
  featuredStat: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  featuredValue: {
    fontSize: 88,
    fontWeight: '200',
    color: theme.accent,
    fontFamily: 'Georgia',
    letterSpacing: 2,
    textShadowColor: 'rgba(245,198,120,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  featuredLabel: {
    fontSize: 15,
    color: theme.textDim,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.border,
    marginVertical: 28,
    marginHorizontal: 40,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCell: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontFamily: 'Georgia',
    fontWeight: '300',
    color: theme.text,
    letterSpacing: 1,
  },
  statLabel: {
    fontSize: 12,
    color: theme.textDim,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  footNote: {
    marginTop: 32,
    fontSize: 13,
    color: theme.textDim,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
