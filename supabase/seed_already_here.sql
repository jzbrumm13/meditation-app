-- ─── Insert "Already Here" meditation (5/10/15/20 min variants) ──────
--
-- Run in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/taqfbmnufklrbvbsklnw/sql
--
-- Pre-req: upload the four MP3s to the `meditation-audio` storage bucket
-- with these exact filenames (drag-drop in the dashboard works):
--   already-here-5min.mp3
--   already-here-10min.mp3
--   already-here-15min.mp3
--   already-here-20min.mp3

insert into public.meditations
  (title, description, length_minutes, tier_id, audio_path, audio_bytes, published, sort_order)
values
  ('Already Here',
   'A nondual pointing wrapped around the breath. Settle, notice, rest as the awareness everything appears in.',
   5,  'five',     'already-here-5min.mp3',   3588956,  true, 10),

  ('Already Here',
   'A longer arc with breath cycles in the middle — for sits that need a steadier anchor.',
   10, 'ten',      'already-here-10min.mp3',  7199496,  true, 10),

  ('Already Here',
   'Body settling, breath cycles, and pointing back to awareness — wide spaces of silence between.',
   15, 'fifteen',  'already-here-15min.mp3', 10791228, true, 10),

  ('Already Here',
   'The full arc: body, breath, awareness — with long silences for a deep sit.',
   20, 'twenty',   'already-here-20min.mp3', 14364152, true, 10);

-- Verify (optional — comment out if you don't want the result set printed):
select id, title, length_minutes, tier_id, audio_path, audio_bytes, published
  from public.meditations
  where title = 'Already Here'
  order by length_minutes;
