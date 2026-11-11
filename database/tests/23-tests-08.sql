-- Checks for migration 08, run after 22-tests-07.sql in the same database.
-- Alice is the referee, Bob and Pat are players, Mallory isn't a member.
TRUNCATE t.results;

\set A '''a0000000-0000-0000-0000-000000000001'''
\set B '''b0000000-0000-0000-0000-000000000002'''
\set P '''e0000000-0000-0000-0000-000000000005'''
\set M '''d0000000-0000-0000-0000-000000000004'''
\set CAMP '''11111111-1111-1111-1111-111111111111'''

SELECT t.assert('existing campaign got its state',
  (SELECT count(*) = 1 FROM public.campaign_state WHERE campaign_id = :CAMP));

-- Every member reads and edits.
SELECT t.check('player reads state', :B,
  'SELECT 1 FROM public.campaign_state WHERE campaign_id = ' || quote_literal(:CAMP), 'rows=1');
SELECT t.check('player records a trade', :B,
  'UPDATE public.campaign_state SET data = data || ''{"trades":[{"id":"t1","goods":"Spices"}]}'' WHERE campaign_id = ' || quote_literal(:CAMP) || ' RETURNING 1', 'rows=1');
SELECT t.check('another player edits too', :P,
  'UPDATE public.campaign_state SET data = data || ''{"location":"Halcyon"}'' WHERE campaign_id = ' || quote_literal(:CAMP) || ' RETURNING 1', 'rows=1');
SELECT t.check('referee edits too', :A,
  'UPDATE public.campaign_state SET data = data || ''{"date":{"day":105,"year":1105}}'' WHERE campaign_id = ' || quote_literal(:CAMP) || ' RETURNING 1', 'rows=1');
SELECT t.assert('all three edits kept',
  (SELECT data->'trades'->0->>'goods' = 'Spices' AND data->>'location' = 'Halcyon' AND data->'date'->>'year' = '1105'
   FROM public.campaign_state WHERE campaign_id = :CAMP));

-- Outsiders and anon get nothing.
SELECT t.check('non-member reads nothing', :M, 'SELECT 1 FROM public.campaign_state', 'rows=0');
SELECT t.check('non-member cannot edit', :M,
  'UPDATE public.campaign_state SET data = ''{}'' WHERE campaign_id = ' || quote_literal(:CAMP) || ' RETURNING 1', 'rows=0');
SELECT t.check('anon cannot read', NULL, 'SELECT 1 FROM public.campaign_state', 'error');
SELECT t.check('members cannot insert state', :B,
  'INSERT INTO public.campaign_state (campaign_id) VALUES (' || quote_literal(:CAMP) || ') ON CONFLICT DO NOTHING RETURNING 1', 'error');
SELECT t.check('members cannot delete state', :A,
  'DELETE FROM public.campaign_state WHERE campaign_id = ' || quote_literal(:CAMP) || ' RETURNING 1', 'error');
SELECT t.check('state must be an object', :B,
  'UPDATE public.campaign_state SET data = ''[]'' WHERE campaign_id = ' || quote_literal(:CAMP) || ' RETURNING 1', 'error');

-- Referee notes.
SELECT t.check('referee writes campaign notes', :A,
  'INSERT INTO public.campaign_referee_notes (campaign_id, notes) VALUES (' || quote_literal(:CAMP) || ', ''Venn is shadowing them'') RETURNING 1', 'rows=1');
SELECT t.check('player cannot read campaign notes', :B, 'SELECT 1 FROM public.campaign_referee_notes', 'rows=0');
SELECT t.check('player cannot write campaign notes', :B,
  'UPDATE public.campaign_referee_notes SET notes = ''x'' RETURNING 1', 'rows=0');

-- New campaigns get state automatically; deleting a campaign removes it.
SELECT t.check('new campaign', :B,
  'INSERT INTO public.campaigns (id, name, created_by) VALUES (''80000000-0000-0000-0000-000000000008'', ''New'', ' || quote_literal(:B) || ') RETURNING 1', 'rows=1');
SELECT t.assert('…gets its state',
  (SELECT count(*) = 1 FROM public.campaign_state WHERE campaign_id = '80000000-0000-0000-0000-000000000008'));
SELECT t.check('creator deletes it', :B,
  'DELETE FROM public.campaigns WHERE id = ''80000000-0000-0000-0000-000000000008'' RETURNING 1', 'rows=1');
SELECT t.assert('…and its state goes with it',
  (SELECT count(*) = 0 FROM public.campaign_state WHERE campaign_id = '80000000-0000-0000-0000-000000000008'));

SELECT n, CASE WHEN pass THEN 'PASS' ELSE 'FAIL' END AS result, label, detail FROM t.results ORDER BY n;
