// Use the legacy API — expo-file-system v19 introduced a new class-based
// API, but its legacy path-based functions are still supported and are
// the path of least resistance for simple download + cache flows.
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Meditation } from './meditations';

// ─── Offline Cache ───────────────────────────────────────────────────
//
// Strategy:
//   • MP3s are downloaded into the app's sandboxed documentDirectory.
//     This space is preserved across app launches but is cleared on
//     uninstall — exactly what we want.
//   • An index of cached meditations (id → local file URI) lives in
//     AsyncStorage so we can query "is this cached?" synchronously
//     without hitting the filesystem.
//   • The audio player picks local URIs over remote URLs whenever available
//     (see audioPlayer.ts). When offline, the app still plays.

const CACHE_DIR = `${FileSystem.documentDirectory}meditations/`;
const INDEX_KEY = '@offline_cache_index_v1';

interface CacheIndex {
  [meditationId: string]: {
    uri: string;
    bytes: number;
    cachedAt: number; // epoch ms
  };
}

let _indexCache: CacheIndex | null = null;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

async function loadIndex(): Promise<CacheIndex> {
  if (_indexCache) return _indexCache;
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  _indexCache = raw ? (JSON.parse(raw) as CacheIndex) : {};
  return _indexCache;
}

async function saveIndex(idx: CacheIndex) {
  _indexCache = idx;
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(idx));
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Returns the local file URI if the meditation is cached, otherwise null.
 */
export async function getCachedUri(meditationId: string): Promise<string | null> {
  const idx = await loadIndex();
  const entry = idx[meditationId];
  if (!entry) return null;
  // Confirm the file still exists (user could have cleared app data).
  const info = await FileSystem.getInfoAsync(entry.uri);
  if (!info.exists) {
    delete idx[meditationId];
    await saveIndex(idx);
    return null;
  }
  return entry.uri;
}

/**
 * Download a meditation's audio file to local storage and register it
 * in the index. Returns the local URI.
 */
export async function downloadMeditation(m: Meditation): Promise<string> {
  if (!m.audioUrl) throw new Error(`Meditation ${m.id} has no audioUrl`);
  await ensureDir();

  const existing = await getCachedUri(m.id);
  if (existing) return existing;

  // Use the audioPath if available (stable), otherwise derive from the URL.
  const filename = (m.audioPath?.split('/').pop()) ?? `${m.id}.mp3`;
  const target = `${CACHE_DIR}${m.id}__${filename}`;

  const result = await FileSystem.downloadAsync(m.audioUrl, target);
  if (result.status !== 200) {
    throw new Error(`Download failed (HTTP ${result.status}) for meditation ${m.id}`);
  }

  const info = await FileSystem.getInfoAsync(result.uri);
  const bytes = info.exists && 'size' in info && typeof info.size === 'number' ? info.size : 0;

  const idx = await loadIndex();
  idx[m.id] = { uri: result.uri, bytes, cachedAt: Date.now() };
  await saveIndex(idx);

  return result.uri;
}

/**
 * Remove a cached meditation. Safe to call whether or not it exists.
 */
export async function removeCached(meditationId: string): Promise<void> {
  const idx = await loadIndex();
  const entry = idx[meditationId];
  if (!entry) return;
  try {
    await FileSystem.deleteAsync(entry.uri, { idempotent: true });
  } catch {
    // ignore — file might already be gone
  }
  delete idx[meditationId];
  await saveIndex(idx);
}

/**
 * Total bytes used by the cache.
 */
export async function getCacheSize(): Promise<number> {
  const idx = await loadIndex();
  return Object.values(idx).reduce((sum, e) => sum + e.bytes, 0);
}

/**
 * List all cached meditation ids. Useful for a "Manage Downloads" screen later.
 */
export async function getCachedIds(): Promise<string[]> {
  const idx = await loadIndex();
  return Object.keys(idx);
}

/**
 * Clear the entire cache (every downloaded meditation).
 */
export async function clearCache(): Promise<void> {
  try {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
  } catch {
    // ignore
  }
  _indexCache = {};
  await AsyncStorage.removeItem(INDEX_KEY);
}
