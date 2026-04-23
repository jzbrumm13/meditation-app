import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Favorites (hearted meditations) ─────────────────────────────────
//
// Persisted locally in AsyncStorage as a JSON array of meditation ids.
// Kept on-device so users keep their favorites across app launches even
// without an account. (v1 is anonymous — no auth yet.)

const KEY = '@favorites_v1';

let _cache: Set<string> | null = null;

async function load(): Promise<Set<string>> {
  if (_cache) return _cache;
  const raw = await AsyncStorage.getItem(KEY);
  _cache = new Set(raw ? (JSON.parse(raw) as string[]) : []);
  return _cache;
}

async function save(set: Set<string>) {
  _cache = set;
  await AsyncStorage.setItem(KEY, JSON.stringify(Array.from(set)));
}

export async function listFavorites(): Promise<string[]> {
  const s = await load();
  return Array.from(s);
}

export async function isFavorite(id: string): Promise<boolean> {
  const s = await load();
  return s.has(id);
}

export async function addFavorite(id: string): Promise<void> {
  const s = await load();
  s.add(id);
  await save(s);
}

export async function removeFavorite(id: string): Promise<void> {
  const s = await load();
  s.delete(id);
  await save(s);
}

export async function toggleFavorite(id: string): Promise<boolean> {
  const s = await load();
  const now = !s.has(id);
  if (now) s.add(id); else s.delete(id);
  await save(s);
  return now;
}
