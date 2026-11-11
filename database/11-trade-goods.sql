-- =====================================================================
-- 11: Trade goods in the catalogue
--
-- Allows catalogue_items of kind 'trade_good': the Core Rulebook's Trade
-- Goods table, picked onto a campaign's cargo. Their cost is the base
-- price per ton. Reload the catalogue (data/catalogue/load.sql) after
-- applying this.
--
-- Safe to re-run.
-- =====================================================================

BEGIN;

ALTER TABLE public.catalogue_items DROP CONSTRAINT IF EXISTS catalogue_items_kind;
ALTER TABLE public.catalogue_items ADD CONSTRAINT catalogue_items_kind
  CHECK (kind IN ('weapon', 'armour', 'augment', 'software', 'gear', 'trade_good'));

COMMIT;
