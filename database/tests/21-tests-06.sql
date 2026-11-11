-- Checks for migration 06. Uses t.check from 10-tests.sql's pattern.
CREATE SCHEMA IF NOT EXISTS t;
CREATE TABLE IF NOT EXISTS t.results (n SERIAL, label TEXT, pass BOOLEAN, detail TEXT);
TRUNCATE t.results;

CREATE OR REPLACE FUNCTION t.check(label TEXT, uid UUID, q TEXT, expect TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE cnt BIGINT; outcome TEXT;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', COALESCE(uid::TEXT, ''), true);
    IF uid IS NULL THEN SET LOCAL ROLE anon; ELSE SET LOCAL ROLE authenticated; END IF;
    EXECUTE 'WITH x AS (' || q || ') SELECT count(*) FROM x' INTO cnt;
    RESET ROLE;
    outcome := 'rows=' || cnt;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    INSERT INTO t.results (label, pass, detail) VALUES (label, expect = 'error', 'error: ' || SQLERRM);
    RETURN;
  END;
  INSERT INTO t.results (label, pass, detail) VALUES (label, outcome = expect, outcome);
END;
$$;

CREATE OR REPLACE FUNCTION t.assert(label TEXT, ok BOOLEAN, detail TEXT DEFAULT '') RETURNS VOID
LANGUAGE sql AS $$ INSERT INTO t.results (label, pass, detail) VALUES (label, ok, detail) $$;

\set A '''a0000000-0000-0000-0000-000000000001'''
\set B '''b0000000-0000-0000-0000-000000000002'''
\set P '''e0000000-0000-0000-0000-000000000005'''
\set M '''d0000000-0000-0000-0000-000000000004'''
\set KIRI '''cb000000-0000-0000-0000-000000000001'''
\set OREN '''cf000000-0000-0000-0000-000000000002'''
\set BRAM '''cc000000-0000-0000-0000-000000000003'''

-- ---------- backfill ----------
SELECT t.assert('every character has a sheet',
  (SELECT count(*) FROM public.character_sheets) = (SELECT count(*) FROM public.characters));
SELECT t.assert('skills copied, blank names dropped, xp dropped',
  (SELECT data->'skills' FROM public.character_sheets WHERE character_id = :KIRI)
    = '[{"name":"Pilot (spacecraft)","level":2},{"name":"Vacc Suit","level":0}]'::jsonb,
  (SELECT (data->'skills')::text FROM public.character_sheets WHERE character_id = :KIRI));
SELECT t.assert('weapon copied',
  (SELECT data#>>'{weapons,0,name}' || '|' || (data#>>'{weapons,0,kg}') || '|' || (data#>>'{weapons,0,cost}')
   FROM public.character_sheets WHERE character_id = :KIRI) = 'Autopistol|0.75|200');
SELECT t.assert('ammo copied; negative rounds clamped, zero capacity becomes null',
  (SELECT (data#>>'{ammo,0,rounds}') || '|' || (data#>>'{ammo,1,rounds}') || '|' || COALESCE(data#>>'{ammo,1,capacity}', 'null')
   FROM public.character_sheets WHERE character_id = :KIRI) = '15|0|null');
SELECT t.assert('armour copied and worn',
  (SELECT (data#>>'{armour,0,protection}') || '|' || (data#>>'{armour,0,worn}')
   FROM public.character_sheets WHERE character_id = :KIRI) = '2|true');
SELECT t.assert('gear copied, value rounded to whole credits',
  (SELECT (data#>>'{gear,0,name}') || '|' || (data#>>'{gear,0,cost}')
   FROM public.character_sheets WHERE character_id = :KIRI) = 'Commdot|10');
SELECT t.assert('cash is the ledger total, rounded',
  (SELECT data#>>'{finances,cash}' FROM public.character_sheets WHERE character_id = :KIRI) = '750',
  (SELECT data#>>'{finances,cash}' FROM public.character_sheets WHERE character_id = :KIRI));
SELECT t.assert('ledger in date order with ISO dates',
  (SELECT (data#>>'{finances,ledger,0,date}') || '|' || (data#>>'{finances,ledger,1,amount}')
   FROM public.character_sheets WHERE character_id = :KIRI) = '2025-10-01|-251');
SELECT t.assert('null/odd skills json gives an empty list',
  (SELECT data->'skills' FROM public.character_sheets WHERE character_id = :OREN) = '[]'::jsonb);

-- ---------- who can see and edit sheets ----------
SELECT t.check('owner reads own sheet', :B, 'SELECT 1 FROM public.character_sheets WHERE character_id = ' || quote_literal(:KIRI), 'rows=1');
SELECT t.check('owner updates own sheet', :B,
  'UPDATE public.character_sheets SET data = data || ''{"notes":"hi"}'' WHERE character_id = ' || quote_literal(:KIRI) || ' RETURNING 1', 'rows=1');
SELECT t.check('owner reads own unassigned character sheet', :B, 'SELECT 1 FROM public.character_sheets WHERE character_id = ' || quote_literal(:BRAM), 'rows=1');
SELECT t.check('other player cannot read sheet', :P, 'SELECT 1 FROM public.character_sheets WHERE character_id = ' || quote_literal(:KIRI), 'rows=0');
SELECT t.check('other player cannot update sheet', :P,
  'UPDATE public.character_sheets SET data = ''{}'' WHERE character_id = ' || quote_literal(:KIRI) || ' RETURNING 1', 'rows=0');
SELECT t.check('other player still sees roster row', :P, 'SELECT 1 FROM public.characters WHERE id = ' || quote_literal(:KIRI), 'rows=1');
SELECT t.check('referee reads player sheet', :A, 'SELECT 1 FROM public.character_sheets WHERE character_id = ' || quote_literal(:KIRI), 'rows=1');
SELECT t.check('referee updates player sheet', :A,
  'UPDATE public.character_sheets SET data = data || ''{"rads":20}'' WHERE character_id = ' || quote_literal(:KIRI) || ' RETURNING 1', 'rows=1');
SELECT t.check('referee cannot read unassigned character', :A, 'SELECT 1 FROM public.character_sheets WHERE character_id = ' || quote_literal(:BRAM), 'rows=0');
SELECT t.check('outsider reads nothing', :M, 'SELECT 1 FROM public.character_sheets', 'rows=0');
SELECT t.check('outsider cannot insert a sheet for someone else', :M,
  'INSERT INTO public.character_sheets (character_id) VALUES (' || quote_literal(:OREN) || ') ON CONFLICT DO NOTHING RETURNING 1', 'error');
SELECT t.check('anon cannot read sheets', NULL, 'SELECT 1 FROM public.character_sheets', 'error');
SELECT t.check('nobody can delete a sheet directly', :B,
  'DELETE FROM public.character_sheets WHERE character_id = ' || quote_literal(:KIRI) || ' RETURNING 1', 'error');
SELECT t.check('sheet must be a JSON object', :B,
  'UPDATE public.character_sheets SET data = ''[1]'' WHERE character_id = ' || quote_literal(:KIRI) || ' RETURNING 1', 'error');
SELECT t.check('oversized sheet rejected', :B,
  'UPDATE public.character_sheets SET data = jsonb_build_object(''notes'', (SELECT string_agg(md5(i::text), '''') FROM generate_series(1, 20000) i)) WHERE character_id = ' || quote_literal(:KIRI) || ' RETURNING 1', 'error');

-- ---------- referee notes ----------
SELECT t.check('referee writes notes', :A,
  'INSERT INTO public.character_referee_notes (character_id, notes) VALUES (' || quote_literal(:KIRI) || ', ''Venn knows'') RETURNING 1', 'rows=1');
SELECT t.check('owner cannot read referee notes', :B, 'SELECT 1 FROM public.character_referee_notes', 'rows=0');
SELECT t.check('owner cannot write referee notes', :B,
  'INSERT INTO public.character_referee_notes (character_id, notes) VALUES (' || quote_literal(:BRAM) || ', ''x'') RETURNING 1', 'error');
SELECT t.check('referee reads notes', :A, 'SELECT 1 FROM public.character_referee_notes', 'rows=1');

-- ---------- triggers ----------
SELECT t.check('new character gets a sheet automatically', :B,
  'INSERT INTO public.characters (name, owner_id) VALUES (''New'', ' || quote_literal(:B) || ') RETURNING 1', 'rows=1');
SELECT t.check('…which the owner can read', :B,
  'SELECT 1 FROM public.character_sheets s JOIN public.characters c ON c.id = s.character_id WHERE c.name = ''New''', 'rows=1');
SELECT t.assert('updated_at moves on update',
  (SELECT updated_at > NOW() - INTERVAL '1 minute' FROM public.character_sheets WHERE character_id = :KIRI));
SELECT t.check('deleting a character removes its sheet', :B,
  'DELETE FROM public.characters WHERE name = ''New'' RETURNING 1', 'rows=1');
SELECT t.assert('…and the sheet is gone',
  (SELECT count(*) = 0 FROM public.character_sheets s WHERE NOT EXISTS (SELECT 1 FROM public.characters c WHERE c.id = s.character_id)));

-- Report
SELECT n, CASE WHEN pass THEN 'PASS' ELSE 'FAIL' END AS result, label, detail FROM t.results ORDER BY n;
SELECT count(*) FILTER (WHERE pass) AS passed, count(*) FILTER (WHERE NOT pass) AS failed FROM t.results;
