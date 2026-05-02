-- ─── Insert "Already Awake" meditation (5/10/15/20/30 min variants) ──
--
-- Run in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/taqfbmnufklrbvbsklnw/sql
--
-- Pre-req: upload the five MP3s to the `meditation-audio` storage bucket
-- with these exact filenames (drag-drop in the dashboard works):
--   already-awake-5min.mp3
--   already-awake-10min.mp3
--   already-awake-15min.mp3
--   already-awake-20min.mp3
--   already-awake-30min.mp3
--
-- Source files live in ~/Documents/meditations/ — drag those directly.

insert into public.meditations
  (title, description, length_minutes, tier_id, audio_path, audio_bytes, published, sort_order)
values
  ('Already Awake',
   'Pointing-out instructions, two silent sits, and a minute of eyes-open rest before the bell.',
   5,  'five',     'already-awake-5min.mp3',   3604316,  true, 20),

  ('Already Awake',
   'Three pointing teachings with steady silences — closing with two minutes of eyes-open practice.',
   10, 'ten',      'already-awake-10min.mp3',  7218618,  true, 20),

  ('Already Awake',
   'A deeper pass with substantial silences and nearly four minutes of eyes-open rest at the close.',
   15, 'fifteen',  'already-awake-15min.mp3', 10806588, true, 20),

  ('Already Awake',
   'Long silences between teachings and a five-minute eyes-open integration period.',
   20, 'twenty',   'already-awake-20min.mp3', 14406784, true, 20),

  ('Already Awake',
   'The longest arc — for experienced sitters. Generous silences and nine minutes of eyes-open practice.',
   30, 'thirty',   'already-awake-30min.mp3', 21606549, true, 20);

-- Verify (optional — comment out if you don't want the result set printed):
select id, title, length_minutes, tier_id, audio_path, audio_bytes, published
  from public.meditations
  where title = 'Already Awake'
  order by length_minutes;
