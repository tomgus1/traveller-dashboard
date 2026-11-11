-- Checks for migration 07, run after 21-tests-06.sql in the same database.
TRUNCATE t.results;

\set A '''a0000000-0000-0000-0000-000000000001'''
\set B '''b0000000-0000-0000-0000-000000000002'''
\set P '''e0000000-0000-0000-0000-000000000005'''
\set KIRI '''cb000000-0000-0000-0000-000000000001'''
\set OREN '''cf000000-0000-0000-0000-000000000002'''

SELECT t.check('owner updates own sheet', :B,
  'UPDATE public.character_sheets SET data = data || ''{"notes":"mine"}'' WHERE character_id = ' || quote_literal(:KIRI) || ' RETURNING 1', 'rows=1');
SELECT t.check('referee still reads player sheet', :A,
  'SELECT 1 FROM public.character_sheets WHERE character_id = ' || quote_literal(:KIRI), 'rows=1');
SELECT t.check('referee can no longer update player sheet', :A,
  'UPDATE public.character_sheets SET data = data || ''{"rads":99}'' WHERE character_id = ' || quote_literal(:KIRI) || ' RETURNING 1', 'rows=0');
SELECT t.assert('…and the sheet is unchanged',
  (SELECT data->>'rads' FROM public.character_sheets WHERE character_id = :KIRI) IS DISTINCT FROM '99');
SELECT t.check('referee cannot create a sheet for a player character', :A,
  'INSERT INTO public.character_sheets (character_id) VALUES (' || quote_literal(:OREN) || ') ON CONFLICT DO NOTHING RETURNING 1', 'error');
SELECT t.check('other player still cannot read', :P,
  'SELECT 1 FROM public.character_sheets WHERE character_id = ' || quote_literal(:KIRI), 'rows=0');
SELECT t.check('referee still writes referee notes', :A,
  'UPDATE public.character_referee_notes SET notes = ''Updated'' WHERE character_id = ' || quote_literal(:KIRI) || ' RETURNING 1', 'rows=1');
SELECT t.check('referee cannot change characteristics either', :A,
  'UPDATE public.characters SET characteristics = characteristics WHERE id = ' || quote_literal(:KIRI) || ' RETURNING 1', 'rows=0');

SELECT n, CASE WHEN pass THEN 'PASS' ELSE 'FAIL' END AS result, label, detail FROM t.results ORDER BY n;
