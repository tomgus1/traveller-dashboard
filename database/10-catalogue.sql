-- =====================================================================
-- 10: Equipment catalogue
--
-- Adds:
--   catalogue_items          weapons, armour, augments, software and gear
--                            from the rulebooks the group owns, with their
--                            stats, for picking onto character sheets.
--   load_catalogue(jsonb)    loads one book's catalogue file (made by
--                            crates/catalogue-extract), replacing what was
--                            there for that book. Not callable by clients:
--                            run the generated load script in the SQL
--                            editor.
--
-- The book data is copyrighted, so it isn't in this repository and is
-- readable only by signed-in members of at least one campaign. Each row's
-- `item` is a CatalogueItem (crates/traveller-model/src/catalogue.rs).
--
-- Safe to re-run.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.catalogue_items (
  id TEXT PRIMARY KEY,
  book TEXT NOT NULL,
  page INTEGER,
  section TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  tl SMALLINT,
  cost BIGINT,
  item JSONB NOT NULL,
  CONSTRAINT catalogue_items_kind CHECK (kind IN ('weapon', 'armour', 'augment', 'software', 'gear')),
  CONSTRAINT catalogue_items_item_is_object CHECK (jsonb_typeof(item) = 'object'),
  CONSTRAINT catalogue_items_item_size CHECK (pg_column_size(item) < 65536)
);

CREATE INDEX IF NOT EXISTS catalogue_items_kind_name ON public.catalogue_items (kind, name);

-- Whether the current user belongs to any campaign.
CREATE OR REPLACE FUNCTION public.is_any_campaign_member()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaign_members m WHERE m.user_id = auth.uid()
  );
$$;
-- 05 revokes EXECUTE on new functions by default; the read policy below
-- calls this as the signed-in user.
REVOKE EXECUTE ON FUNCTION public.is_any_campaign_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_any_campaign_member() TO authenticated;

-- Loads one book: upserts its items and removes that book's items the
-- file no longer has. Returns how many items it loaded.
CREATE OR REPLACE FUNCTION public.load_catalogue(p_catalogue JSONB)
RETURNS INTEGER
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  v_book TEXT := p_catalogue->>'book';
  v_count INTEGER;
BEGIN
  IF v_book IS NULL OR jsonb_typeof(p_catalogue->'items') <> 'array' THEN
    RAISE EXCEPTION 'not a catalogue file: needs "book" and an "items" array';
  END IF;

  INSERT INTO public.catalogue_items (id, book, page, section, kind, name, tl, cost, item)
  SELECT
    i->>'id',
    v_book,
    (i->>'page')::integer,
    COALESCE(i->>'section', ''),
    i->>'kind',
    i->>'name',
    (i->>'tl')::smallint,
    (i->>'cost')::bigint,
    i
  FROM jsonb_array_elements(p_catalogue->'items') AS i
  ON CONFLICT (id) DO UPDATE SET
    book = EXCLUDED.book,
    page = EXCLUDED.page,
    section = EXCLUDED.section,
    kind = EXCLUDED.kind,
    name = EXCLUDED.name,
    tl = EXCLUDED.tl,
    cost = EXCLUDED.cost,
    item = EXCLUDED.item;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  DELETE FROM public.catalogue_items c
  WHERE c.book = v_book
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_catalogue->'items') AS i
      WHERE i->>'id' = c.id
    );

  RETURN v_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.load_catalogue(JSONB) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security: members read; nobody writes through the API.
-- ---------------------------------------------------------------------

ALTER TABLE public.catalogue_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Campaign members read the catalogue" ON public.catalogue_items;
CREATE POLICY "Campaign members read the catalogue"
  ON public.catalogue_items FOR SELECT TO authenticated
  USING (public.is_any_campaign_member());

REVOKE ALL ON public.catalogue_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.catalogue_items TO authenticated;

COMMIT;
