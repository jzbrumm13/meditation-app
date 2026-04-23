import { Tier } from '../config/tiers';
import { supabase, isSupabaseConfigured } from './supabase';

// ─── Types ───────────────────────────────────────────────────────────

export interface Meditation {
  id: string;
  title: string;
  teacher?: string;
  /** Length in minutes. */
  lengthMinutes: number;
  /** Remote audio URL (resolved from Supabase Storage at fetch time). */
  audioUrl: string;
  /** Storage-relative path, used for offline caching lookups. */
  audioPath?: string;
  /** Approximate size in bytes, used by the offline-download UI. */
  audioBytes?: number;
  /** Which tier this meditation belongs to. */
  tierId: Tier['id'];
  /** Optional subtitle / description. */
  description?: string;
  /** True if the file is cached on-device for offline playback. */
  cachedLocally?: boolean;
}

// ─── Placeholder Catalogue (fallback until Supabase is configured) ───

const PLACEHOLDER_CATALOGUE: Meditation[] = [
  // 5 min
  { id: '5-1',  title: 'Morning Reset',       lengthMinutes: 5,  tierId: 'five',       audioUrl: '', description: 'Gentle wake-up for the mind' },
  { id: '5-2',  title: 'Three Breaths',       lengthMinutes: 5,  tierId: 'five',       audioUrl: '', description: 'Returning to the body' },

  // 10 min
  { id: '10-1', title: 'Breath Anchor',       lengthMinutes: 10, tierId: 'ten',        audioUrl: '', description: 'Settle into the breath' },
  { id: '10-2', title: 'Body Scan',           lengthMinutes: 10, tierId: 'ten',        audioUrl: '', description: 'From head to feet' },

  // 15 min
  { id: '15-1', title: 'Loving Kindness',     lengthMinutes: 15, tierId: 'fifteen',    audioUrl: '', description: 'Metta — self and others' },
  { id: '15-2', title: 'Open Awareness',      lengthMinutes: 15, tierId: 'fifteen',    audioUrl: '', description: 'Resting as open attention' },

  // 30 min
  { id: '30-1', title: 'Classical Vipassana', lengthMinutes: 30, tierId: 'thirty',     audioUrl: '', description: 'Anchored on the breath' },
  { id: '30-2', title: 'Walking Sit',         lengthMinutes: 30, tierId: 'thirty',     audioUrl: '', description: 'Alternating stillness and gentle walk' },

  // 45 min
  { id: '45-1', title: 'The Long Form',       lengthMinutes: 45, tierId: 'fortyFive',  audioUrl: '', description: 'Unguided — just a bell at the end' },

  // 60 min
  { id: '60-1', title: 'Full Hour',           lengthMinutes: 60, tierId: 'sixty',      audioUrl: '', description: 'A full hour — the deepest container' },
];

// ─── API ─────────────────────────────────────────────────────────────

/**
 * Fetch all meditations for a given tier.
 *
 * Uses Supabase when credentials are configured (see src/services/supabase.ts),
 * otherwise falls back to the placeholder catalogue so the UI stays functional
 * during development.
 */
export async function fetchMeditationsForTier(tier: Tier): Promise<Meditation[]> {
  if (!isSupabaseConfigured()) {
    return PLACEHOLDER_CATALOGUE.filter(m => m.tierId === tier.id);
  }

  const sb = supabase();
  const { data, error } = await sb
    .from('meditations')
    .select('id, title, description, teacher, length_minutes, tier_id, audio_path, audio_bytes')
    .eq('published', true)
    .eq('tier_id', tier.id)
    .order('sort_order', { ascending: true });

  if (error) {
    console.warn('Supabase fetch failed, falling back to placeholders:', error.message);
    return PLACEHOLDER_CATALOGUE.filter(m => m.tierId === tier.id);
  }

  return (data ?? []).map(row => ({
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    teacher: row.teacher as string | undefined,
    lengthMinutes: row.length_minutes as number,
    tierId: row.tier_id as Tier['id'],
    audioPath: row.audio_path as string,
    audioBytes: row.audio_bytes as number | undefined,
    // Build the public URL for the audio file.
    audioUrl: sb.storage.from('meditation-audio').getPublicUrl(row.audio_path as string).data.publicUrl,
  }));
}

/**
 * Pick a random meditation matching the given tier. Returns null if the
 * tier has no published meditations yet.
 *
 * Used by the candle auto-play flow: user drags → releases → we pick a
 * random meditation of the right length and start it automatically.
 */
export async function pickRandomForTier(tier: Tier): Promise<Meditation | null> {
  const list = await fetchMeditationsForTier(tier);
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}
