-- ─── Meditation App — Supabase Schema ─────────────────────────────────
--
-- Run this once in the Supabase SQL editor for the meditation-app project.
-- Creates the meditations table, a public storage bucket for audio files,
-- and read-only RLS policies so the mobile client can fetch the catalogue
-- without needing authentication (v1 is a free, anonymous listening app).
--
-- To run: https://supabase.com/dashboard/project/<your-project>/sql
-- Copy this whole file and click Run.

-- ─── Extensions ─────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── meditations ────────────────────────────────────────────────────
create table if not exists public.meditations (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  title           text        not null,
  description     text,
  teacher         text,

  -- Length in minutes. Used to match against tiers (see src/config/tiers.ts).
  length_minutes  int         not null check (length_minutes > 0 and length_minutes <= 120),

  -- Which tier this meditation belongs to. Must match the Tier ids in src/config/tiers.ts.
  -- Each tier corresponds to a candle snap height: 5, 10, 15, 20, 30, 45, 60 minutes.
  tier_id         text        not null check (tier_id in ('five','ten','fifteen','twenty','thirty','fortyFive','sixty')),

  -- Storage path inside the 'meditation-audio' bucket (e.g. 'quickReset/three-breaths.mp3').
  -- We store the *path* so we can regenerate public URLs if the bucket is moved.
  audio_path      text        not null,

  -- Approximate file size in bytes — useful for the offline pre-download UI
  -- to show the user how much space a download will use.
  audio_bytes     int,

  -- Publish gate: the app only fetches meditations where published=true.
  published       boolean     not null default false,

  -- Free-form ordering within a tier. Lower = shown first.
  sort_order      int         not null default 0
);

create index if not exists meditations_tier_idx     on public.meditations (tier_id, sort_order) where published = true;
create index if not exists meditations_published_idx on public.meditations (published);

-- Auto-update updated_at on row modification.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists meditations_set_updated_at on public.meditations;
create trigger meditations_set_updated_at
  before update on public.meditations
  for each row execute function public.set_updated_at();

-- ─── Row Level Security ─────────────────────────────────────────────
alter table public.meditations enable row level security;

-- Anyone can read published rows. No auth required for v1.
drop policy if exists "public can read published meditations" on public.meditations;
create policy "public can read published meditations"
  on public.meditations for select
  using (published = true);

-- ─── Storage Bucket ─────────────────────────────────────────────────
-- Public bucket for MP3 files. Files are served over HTTPS at:
--   https://<project>.supabase.co/storage/v1/object/public/meditation-audio/<path>
insert into storage.buckets (id, name, public)
values ('meditation-audio', 'meditation-audio', true)
on conflict (id) do update set public = true;

-- RLS policy: anyone can read from meditation-audio (but only service_role can write).
drop policy if exists "public can read meditation-audio" on storage.objects;
create policy "public can read meditation-audio"
  on storage.objects for select
  using (bucket_id = 'meditation-audio');

-- ─── Helper View ────────────────────────────────────────────────────
-- The client fetches this view instead of the raw table so we can expose
-- the full public audio URL without the client needing to know the bucket
-- URL pattern.
create or replace view public.meditations_public as
  select
    id, title, description, teacher,
    length_minutes, tier_id, sort_order,
    audio_bytes,
    -- Build the full public URL from the stored path.
    'https://' || (select split_part(split_part(current_setting('request.headers', true)::json->>'host', ':', 1), '.', 1))
      || '.supabase.co/storage/v1/object/public/meditation-audio/' || audio_path
      as audio_url,
    audio_path
  from public.meditations
  where published = true
  order by tier_id, sort_order;

-- Note: the URL concatenation above is a best-effort default. In practice it's
-- simpler to build the URL on the client using the Supabase JS SDK:
--   supabase.storage.from('meditation-audio').getPublicUrl(audio_path)
-- The view is a fallback for direct REST access.

grant select on public.meditations_public to anon, authenticated;
