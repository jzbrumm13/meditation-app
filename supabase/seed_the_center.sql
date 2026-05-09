-- ─── Insert "The Center" meditation (10/15/20/30 min variants) ───────
--
-- Run in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/taqfbmnufklrbvbsklnw/sql
--
-- Pre-req: upload the four MP3s to the `meditation-audio` storage bucket
-- with these exact filenames (drag-drop in the dashboard works):
--   the-center-10min.mp3
--   the-center-15min.mp3
--   the-center-20min.mp3
--   the-center-30min.mp3
--
-- Source files live in audio-build/output/ — drag those directly.
--
-- A guided cosmic-zoom visualization in 14 narrated segments. Starts
-- with the user observing their own body in third person, zooms out
-- through city → country → Earth → solar system → galaxy → universe,
-- then a long silent pause to sit with the scale, then zooms back in
-- to the body and ends with the same-awareness pointer. Skips the 5-min
-- variant because the zoom-out narrative needs space to land.

insert into public.meditations
  (title, description, length_minutes, tier_id, audio_path, audio_bytes, published, sort_order)
values
  ('The Center',
   'A guided zoom out from your body to the edge of the universe — and back.',
   10, 'ten',     'the-center-10min.mp3',   7279117,  true, 30),

  ('The Center',
   'Longer pauses between each scale, with two minutes alone at the widest view.',
   15, 'fifteen', 'the-center-15min.mp3',  10879000,  true, 30),

  ('The Center',
   'Generous silences between zoom levels and three minutes of stillness when the universe is fully open.',
   20, 'twenty',  'the-center-20min.mp3',  14479196,  true, 30),

  ('The Center',
   'The longest arc — for experienced sitters. Long sits between each scale and four minutes alone with the universe.',
   30, 'thirty',  'the-center-30min.mp3',  21678960,  true, 30);

-- Verify (optional — comment out if you don't want the result set printed):
select id, title, length_minutes, tier_id, audio_path, audio_bytes, published
  from public.meditations
  where title = 'The Center'
  order by length_minutes;
