import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Session Stats ───────────────────────────────────────────────────
//
// Tracks three things across the user's practice:
//   • Current streak — consecutive days with at least one completed session
//   • Total sessions — lifetime count of completed sessions
//   • Total minutes — lifetime sum of session lengths (minutes)
//
// A "completed" session is one where the candle burned all the way down
// (onBurnComplete fires). Extinguished-early sessions are intentionally
// NOT counted — the practice is finishing what you committed to.
//
// Streak logic: a session counts for the day it finishes. If the user
// meditates today, the streak persists. If they miss a full calendar day,
// the streak resets to 1 on their next session.

const KEY = '@session_stats_v1';

export interface SessionStats {
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  /** ISO date string YYYY-MM-DD of the most recent session (local time). */
  lastSessionDate: string | null;
}

const EMPTY: SessionStats = {
  totalSessions: 0,
  totalMinutes: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastSessionDate: null,
};

let _cache: SessionStats | null = null;

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function loadStats(): Promise<SessionStats> {
  if (_cache) return _cache;
  const raw = await AsyncStorage.getItem(KEY);
  const loaded: SessionStats = raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  _cache = loaded;
  return loaded;
}

async function saveStats(stats: SessionStats) {
  _cache = stats;
  await AsyncStorage.setItem(KEY, JSON.stringify(stats));
}

/**
 * Record a completed session. Updates totals and streak.
 * Returns the new stats object.
 */
export async function recordSession(minutes: number): Promise<SessionStats> {
  const stats = await loadStats();
  const today = todayIso();
  const yesterday = yesterdayIso();

  const updated: SessionStats = {
    ...stats,
    totalSessions: stats.totalSessions + 1,
    totalMinutes: stats.totalMinutes + minutes,
  };

  if (stats.lastSessionDate === today) {
    // Already meditated today — streak unchanged
  } else if (stats.lastSessionDate === yesterday) {
    // Meditated yesterday, meditating today — streak advances
    updated.currentStreak = stats.currentStreak + 1;
  } else {
    // First session, or broke streak — restart at 1
    updated.currentStreak = 1;
  }

  updated.longestStreak = Math.max(stats.longestStreak, updated.currentStreak);
  updated.lastSessionDate = today;

  await saveStats(updated);
  return updated;
}

/** Clear all stats. Meant for a future "reset data" option in settings. */
export async function resetStats(): Promise<void> {
  _cache = { ...EMPTY };
  await AsyncStorage.removeItem(KEY);
}
