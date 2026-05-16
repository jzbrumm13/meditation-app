-- ─── Fix audio_path mismatches ───────────────────────────────────────
--
-- Run in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/taqfbmnufklrbvbsklnw/sql
--
-- Background: 15 of 29 published meditations had audio_path values
-- pointing at the wrong location in the meditation-audio bucket. The
-- actual files live in tier subfolders (`five/`, `ten/`, etc.) but
-- the seed scripts wrote root-level paths. The 45-min rows also used
-- camelCase `fortyFive/...` while the bucket folder is lowercase
-- `fourtyfive/...`.
--
-- This script fixes every broken row by id so it's idempotent and
-- order-independent. Each UPDATE changes exactly one row.
--
-- Already Here 10-min — the file (`ten/already-here-10min.mp3`) must
-- be uploaded to the bucket before this row will play. The path is
-- corrected here regardless; the row will simply 404 until the file
-- is uploaded.

-- Already Awake (5/10/15/20/30) — add tier-folder prefix
update public.meditations set audio_path = 'five/already-awake-5min.mp3'
  where id = '82598b4c-ea98-46f8-910b-3580609fe632';
update public.meditations set audio_path = 'ten/already-awake-10min.mp3'
  where id = 'a4ff6535-9237-4e9d-a554-87631ac9b059';
update public.meditations set audio_path = 'fifteen/already-awake-15min.mp3'
  where id = '2537ebf4-842b-47db-8095-8beab642c182';
update public.meditations set audio_path = 'twenty/already-awake-20min.mp3'
  where id = '9178d235-f758-4f22-b53c-38f0380b848a';
update public.meditations set audio_path = 'thirty/already-awake-30min.mp3'
  where id = 'c93fee6b-22f4-4554-9c99-ebefa8fa328f';

-- Already Here (5/10/15/20) — add tier-folder prefix
update public.meditations set audio_path = 'five/already-here-5min.mp3'
  where id = 'dd38ad15-fd16-4108-bec8-c23eeb0f8c21';
update public.meditations set audio_path = 'ten/already-here-10min.mp3'
  where id = 'd05c4ed2-39d9-49f5-a4d5-968510cde3d9';
update public.meditations set audio_path = 'fifteen/already-here-15min.mp3'
  where id = 'fcb4cbbc-d1d9-47da-bd66-541e83b1c33f';
update public.meditations set audio_path = 'twenty/already-here-20min.mp3'
  where id = '6e4ec1ca-560d-406f-9d6c-04a3efc6f26a';

-- The Center (10/15/20/30) — add tier-folder prefix
update public.meditations set audio_path = 'ten/the-center-10min.mp3'
  where id = '13971f6b-bc1c-4785-9b4a-f962ec9d3bdf';
update public.meditations set audio_path = 'fifteen/the-center-15min.mp3'
  where id = '7a4df3ec-a57a-4e81-a0e3-17c735d2782f';
update public.meditations set audio_path = 'twenty/the-center-20min.mp3'
  where id = '01fb7589-576b-4c21-b2cf-c67708311206';
update public.meditations set audio_path = 'thirty/the-center-30min.mp3'
  where id = 'db2d1b7e-2bea-46af-97e4-bad801bbe535';

-- 45-min rows — bucket folder is misspelled `fourtyfive`, not `fortyFive`
update public.meditations set audio_path = 'fourtyfive/inquiry-4-45min.mp3'
  where id = 'adcf40a3-ecac-4919-96d0-6efe3c3a316f';
update public.meditations set audio_path = 'fourtyfive/open-5-45min.mp3'
  where id = '32483eff-10fd-4d12-8068-56c15c0e4d44';

-- Verify (should print 15 rows, all with subfolder paths now)
select title, length_minutes, tier_id, audio_path
  from public.meditations
  where id in (
    '82598b4c-ea98-46f8-910b-3580609fe632',
    'a4ff6535-9237-4e9d-a554-87631ac9b059',
    '2537ebf4-842b-47db-8095-8beab642c182',
    '9178d235-f758-4f22-b53c-38f0380b848a',
    'c93fee6b-22f4-4554-9c99-ebefa8fa328f',
    'dd38ad15-fd16-4108-bec8-c23eeb0f8c21',
    'd05c4ed2-39d9-49f5-a4d5-968510cde3d9',
    'fcb4cbbc-d1d9-47da-bd66-541e83b1c33f',
    '6e4ec1ca-560d-406f-9d6c-04a3efc6f26a',
    '13971f6b-bc1c-4785-9b4a-f962ec9d3bdf',
    '7a4df3ec-a57a-4e81-a0e3-17c735d2782f',
    '01fb7589-576b-4c21-b2cf-c67708311206',
    'db2d1b7e-2bea-46af-97e4-bad801bbe535',
    'adcf40a3-ecac-4919-96d0-6efe3c3a316f',
    '32483eff-10fd-4d12-8068-56c15c0e4d44'
  )
  order by title, length_minutes;
