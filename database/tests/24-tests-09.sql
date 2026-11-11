-- Checks for migration 09, run after 23-tests-08.sql in the same database.
-- 09 is applied once before this file (with seed rows), then this file
-- re-applies it to check nothing is imported twice.
TRUNCATE t.results;

\set CAMP '''11111111-1111-1111-1111-111111111111'''

-- Party funds: Income 1000, Expense 250.50 (rounds to 251), Transfer 300.
SELECT t.assert('party ledger imported in date order',
  (SELECT jsonb_agg(e->>'description' ORDER BY ord) = '["Mustering-out pay", "Berthing", "Moved to ship fund"]'::jsonb
   FROM public.campaign_state s, jsonb_array_elements(s.data->'funds'->'ledger') WITH ORDINALITY AS x(e, ord)
   WHERE s.campaign_id = :CAMP),
  (SELECT (data->'funds'->'ledger')::text FROM public.campaign_state WHERE campaign_id = :CAMP));
SELECT t.assert('signs follow the old categories',
  (SELECT jsonb_agg((e->>'amount')::bigint ORDER BY ord) = '[1000, -251, 0]'::jsonb
   FROM public.campaign_state s, jsonb_array_elements(s.data->'funds'->'ledger') WITH ORDINALITY AS x(e, ord)
   WHERE s.campaign_id = :CAMP));
SELECT t.assert('party balance matches the old app (1000 - 251)',
  (SELECT (data->'funds'->>'balance')::bigint = 749 FROM public.campaign_state WHERE campaign_id = :CAMP),
  (SELECT data->'funds'->>'balance' FROM public.campaign_state WHERE campaign_id = :CAMP));
SELECT t.assert('transfer amount kept in its notes',
  (SELECT e->>'notes' LIKE '%Transfer of Cr300%'
   FROM public.campaign_state s, jsonb_array_elements(s.data->'funds'->'ledger') e
   WHERE s.campaign_id = :CAMP AND e->>'description' = 'Moved to ship fund'));
SELECT t.assert('category, payer and original id kept',
  (SELECT e->>'category' = 'Income / Mustering out' AND e->>'by' = 'Kiri' AND e->>'id' = 'f1000000-0000-0000-0000-000000000001'
   FROM public.campaign_state s, jsonb_array_elements(s.data->'funds'->'ledger') e
   WHERE s.campaign_id = :CAMP AND e->>'description' = 'Mustering-out pay'));

-- Ship fund: Income 50000, Expense 3861, Expense 20000.
SELECT t.assert('ship ledger imported separately',
  (SELECT jsonb_array_length(data->'ship_fund'->'ledger') = 3 FROM public.campaign_state WHERE campaign_id = :CAMP));
SELECT t.assert('ship balance matches the old app (50000 - 3861 - 20000)',
  (SELECT (data->'ship_fund'->>'balance')::bigint = 26139 FROM public.campaign_state WHERE campaign_id = :CAMP),
  (SELECT data->'ship_fund'->>'balance' FROM public.campaign_state WHERE campaign_id = :CAMP));

-- Existing data in the new app is kept.
SELECT t.assert('trades added in the new app survive',
  (SELECT data->'trades'->0->>'goods' = 'Spices' FROM public.campaign_state WHERE campaign_id = :CAMP));

-- Re-running imports nothing twice.
\i /tmp/09.sql
SELECT t.assert('re-run adds no entries',
  (SELECT jsonb_array_length(data->'funds'->'ledger') = 3
      AND jsonb_array_length(data->'ship_fund'->'ledger') = 3
   FROM public.campaign_state WHERE campaign_id = :CAMP));
SELECT t.assert('re-run leaves balances alone',
  (SELECT (data->'funds'->>'balance')::bigint = 749 AND (data->'ship_fund'->>'balance')::bigint = 26139
   FROM public.campaign_state WHERE campaign_id = :CAMP));

-- A new entry in the old table since the last run is picked up once.
INSERT INTO public.ship_finances (id, campaign_id, transaction_date, description, category, amount)
VALUES ('f2000000-0000-0000-0000-000000000009', :CAMP, '2025-11-01', 'Late fuel bill', 'Expense', 500);
\i /tmp/09.sql
SELECT t.assert('later old entries are added once, balance adjusted',
  (SELECT jsonb_array_length(data->'ship_fund'->'ledger') = 4 AND (data->'ship_fund'->>'balance')::bigint = 25639
   FROM public.campaign_state WHERE campaign_id = :CAMP));

-- The result still loads as the app's document (shape spot-checks).
SELECT t.assert('ledger entries have the fields the app reads',
  (SELECT bool_and(e ? 'id' AND e ? 'date' AND e ? 'description' AND e ? 'amount' AND e ? 'category' AND e ? 'by' AND e ? 'notes')
   FROM public.campaign_state s,
        jsonb_array_elements((s.data->'funds'->'ledger') || (s.data->'ship_fund'->'ledger')) e
   WHERE s.campaign_id = :CAMP));

SELECT n, CASE WHEN pass THEN 'PASS' ELSE 'FAIL' END AS result, label, detail FROM t.results ORDER BY n;
