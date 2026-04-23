import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Supabase Client ─────────────────────────────────────────────────
//
// Fill these in with the values from your Supabase project settings:
//   Project URL: Settings → API → Project URL
//   Anon key:    Settings → API → Project API keys → anon public
//
// These are *public* keys — safe to include in the client bundle. RLS on
// the meditations table restricts reads to published=true rows only, so
// the anon key cannot be used to read unpublished drafts.

const SUPABASE_URL: string = 'https://taqfbmnufklrbvbsklnw.supabase.co';
const SUPABASE_ANON_KEY: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcWZibW51ZmtscmJ2YnNrbG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MjI1OTcsImV4cCI6MjA5MjI5ODU5N30.YbX7HNLKe740fn2UHJK9PmdRbRKCsP5jeF7rS5doKI4';

// Lazy singleton — avoid instantiating before keys are set.
let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!_client) {
    if (SUPABASE_URL.includes('YOUR-PROJECT') || SUPABASE_ANON_KEY === 'YOUR-ANON-KEY') {
      throw new Error(
        'Supabase credentials not configured. Edit src/services/supabase.ts with your project URL and anon key.',
      );
    }
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false }, // v1 has no auth
    });
  }
  return _client;
}

/**
 * Returns true when the anon key and URL have been configured with real values.
 * Use this to decide whether to fall back to the placeholder catalogue.
 */
export function isSupabaseConfigured(): boolean {
  return !SUPABASE_URL.includes('YOUR-PROJECT') && SUPABASE_ANON_KEY !== 'YOUR-ANON-KEY';
}
