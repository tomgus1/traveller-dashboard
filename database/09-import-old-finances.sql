-- =====================================================================
-- 09: Bring the old app's finances into the shared campaign state
--
-- The old app kept two ledgers per campaign:
--   campaign_finances  -> state.funds      (party funds)
--   ship_finances      -> state.ship_fund  (the ship's account)
--
-- The old app stored every amount as a positive number; the category gave
-- its effect (getCurrentBalance in src/shared/utils/finance.ts):
--   Income   adds        -> +amount
--   Expense  subtracts   -> -amount
--   Transfer no effect   -> 0, with the amount kept in the entry's notes
-- So each fund's balance comes out the same as the old app showed.
--
-- Entries keep their original ids. Re-running adds nothing twice, and
-- entries already added in the new app are kept; the balance only moves
-- by the entries this migration adds.
--
-- Needs migration 08. The old tables are left in place. The other old
-- campaign tables (ship_cargo, ship_maintenance, campaign_loans,
-- party_inventory, campaign_ammo) were empty when this was written; a
-- notice is raised if any now hold rows, as they aren't imported.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.import_ledger(p_table TEXT, p_fund TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format($sql$
    WITH old AS (
      SELECT
        f.campaign_id,
        f.id::text AS id,
        f.transaction_date,
        f.created_at,
        CASE f.category
          WHEN 'Income' THEN ROUND(ABS(COALESCE(f.amount, 0)))::bigint
          WHEN 'Expense' THEN -ROUND(ABS(COALESCE(f.amount, 0)))::bigint
          ELSE 0
        END AS amount,
        f.category,
        f.subcategory,
        f.amount AS original_amount,
        f.paid_by,
        f.notes,
        f.description
      FROM public.%1$I f
    ),
    fresh AS (
      SELECT o.*
      FROM old o
      JOIN public.campaign_state s ON s.campaign_id = o.campaign_id
      WHERE NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(s.data->%2$L->'ledger') = 'array'
               THEN s.data->%2$L->'ledger' ELSE '[]'::jsonb END) e
        WHERE e->>'id' = o.id
      )
    ),
    grouped AS (
      SELECT
        campaign_id,
        jsonb_agg(jsonb_build_object(
          'id', id,
          'date', COALESCE(to_char(transaction_date, 'YYYY-MM-DD'), ''),
          'description', COALESCE(NULLIF(description, ''), '(no description)'),
          'amount', amount,
          'category', concat_ws(' / ', NULLIF(category, ''), NULLIF(subcategory, '')),
          'by', COALESCE(paid_by, ''),
          'notes', concat_ws(' ',
            NULLIF(notes, ''),
            CASE WHEN category = 'Transfer'
                 THEN format('Transfer of Cr%%s (no effect on this balance).', ROUND(ABS(COALESCE(original_amount, 0)))::bigint)
            END)
        ) ORDER BY transaction_date NULLS LAST, created_at) AS entries,
        SUM(amount) AS total
      FROM fresh
      GROUP BY campaign_id
    )
    UPDATE public.campaign_state s
    SET data = jsonb_set(
      s.data,
      ARRAY[%2$L],
      COALESCE(CASE WHEN jsonb_typeof(s.data->%2$L) = 'object' THEN s.data->%2$L END, '{}'::jsonb)
        || jsonb_build_object(
          'ledger',
            COALESCE(CASE WHEN jsonb_typeof(s.data->%2$L->'ledger') = 'array'
                          THEN s.data->%2$L->'ledger' END, '[]'::jsonb)
            || g.entries,
          'balance',
            COALESCE(ROUND((s.data->%2$L->>'balance')::numeric)::bigint, 0) + g.total
        ),
      true
    )
    FROM grouped g
    WHERE g.campaign_id = s.campaign_id
  $sql$, p_table, p_fund);
END;
$$;

SELECT pg_temp.import_ledger('campaign_finances', 'funds');
SELECT pg_temp.import_ledger('ship_finances', 'ship_fund');

DO $$
DECLARE
  t TEXT;
  n BIGINT;
BEGIN
  FOREACH t IN ARRAY ARRAY['ship_cargo', 'ship_maintenance', 'campaign_loans', 'party_inventory', 'campaign_ammo']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
      IF n > 0 THEN
        RAISE NOTICE '% has % row(s) that this migration does not import', t, n;
      END IF;
    END IF;
  END LOOP;
END;
$$;

COMMIT;
