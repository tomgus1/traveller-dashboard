-- =====================================================================
-- 06: Character sheets for the Rust app
--
-- Adds:
--   character_sheets         one JSON document per character: skills,
--                            weapons, armour, gear, finances, contacts,
--                            career, augments, training, notes.
--                            Readable/editable by the owner and the
--                            campaign's referee (GM) only.
--   character_referee_notes  the referee's private notes on a character.
--                            Referees only, never the owner.
--
-- characters keeps name and characteristics, visible to the owner and their
-- campaign (the party roster). Characteristics gain an optional "current"
-- value next to "value" (the maximum); the old app ignores it.
--
-- Existing data in character_weapons, character_ammo, character_armour,
-- character_inventory, character_finance and characters.skills is copied
-- into each sheet. The old tables are left in place and dropped in a later
-- migration once the new sheets have been checked.
--
-- Safe to re-run: the backfill only creates sheets that don't exist yet.
-- The document's shape is defined by crates/traveller-model/src/sheet.rs.
-- =====================================================================

BEGIN;

-- Referee = a campaign member with the GM role.
CREATE OR REPLACE FUNCTION public.is_campaign_referee(p_campaign_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaign_members m
    WHERE m.campaign_id = p_campaign_id AND m.user_id = auth.uid() AND m.is_gm
  );
$$;

-- The character's owner, or the referee of its campaign.
CREATE OR REPLACE FUNCTION public.can_access_sheet(p_character_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.characters c
    WHERE c.id = p_character_id
      AND (c.owner_id = auth.uid()
           OR (c.campaign_id IS NOT NULL AND public.is_campaign_referee(c.campaign_id)))
  );
$$;

-- The referee of the character's campaign (not the owner as such).
CREATE OR REPLACE FUNCTION public.is_referee_of_character(p_character_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.characters c
    WHERE c.id = p_character_id
      AND c.campaign_id IS NOT NULL
      AND public.is_campaign_referee(c.campaign_id)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_campaign_referee(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_sheet(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_referee_of_character(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_campaign_referee(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_sheet(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_referee_of_character(UUID) TO authenticated;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.character_sheets (
  character_id UUID PRIMARY KEY REFERENCES public.characters(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{"version": 1}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT character_sheets_data_is_object CHECK (jsonb_typeof(data) = 'object'),
  -- A sheet is a few KB; this stops a client storing megabytes.
  CONSTRAINT character_sheets_data_size CHECK (pg_column_size(data) < 262144)
);

CREATE TABLE IF NOT EXISTS public.character_referee_notes (
  character_id UUID PRIMARY KEY REFERENCES public.characters(id) ON DELETE CASCADE,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT character_referee_notes_size CHECK (length(notes) <= 20000)
);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS character_sheets_touch ON public.character_sheets;
CREATE TRIGGER character_sheets_touch BEFORE UPDATE ON public.character_sheets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS character_referee_notes_touch ON public.character_referee_notes;
CREATE TRIGGER character_referee_notes_touch BEFORE UPDATE ON public.character_referee_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Every character gets an empty sheet.
CREATE OR REPLACE FUNCTION public.create_character_sheet()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.character_sheets (character_id) VALUES (NEW.id)
  ON CONFLICT (character_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_character_sheet() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS characters_create_sheet ON public.characters;
CREATE TRIGGER characters_create_sheet AFTER INSERT ON public.characters
  FOR EACH ROW EXECUTE FUNCTION public.create_character_sheet();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

ALTER TABLE public.character_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_referee_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner and referee read sheets" ON public.character_sheets;
CREATE POLICY "Owner and referee read sheets"
  ON public.character_sheets FOR SELECT TO authenticated
  USING (public.can_access_sheet(character_id));

DROP POLICY IF EXISTS "Owner and referee create sheets" ON public.character_sheets;
CREATE POLICY "Owner and referee create sheets"
  ON public.character_sheets FOR INSERT TO authenticated
  WITH CHECK (public.can_access_sheet(character_id));

DROP POLICY IF EXISTS "Owner and referee update sheets" ON public.character_sheets;
CREATE POLICY "Owner and referee update sheets"
  ON public.character_sheets FOR UPDATE TO authenticated
  USING (public.can_access_sheet(character_id))
  WITH CHECK (public.can_access_sheet(character_id));
-- No DELETE policy: a sheet goes when its character is deleted.

DROP POLICY IF EXISTS "Referees manage referee notes" ON public.character_referee_notes;
CREATE POLICY "Referees manage referee notes"
  ON public.character_referee_notes FOR ALL TO authenticated
  USING (public.is_referee_of_character(character_id))
  WITH CHECK (public.is_referee_of_character(character_id));

-- Supabase's default privileges grant every table privilege to the client
-- roles. Grant exactly what each table needs instead.
REVOKE ALL ON public.character_sheets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.character_referee_notes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.character_sheets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.character_referee_notes TO authenticated;

-- TRUNCATE ignores Row Level Security. Clients never need it; make sure
-- they can't have it on any table.
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- Backfill from the old tables
-- ---------------------------------------------------------------------

INSERT INTO public.character_sheets (character_id, data)
SELECT
  c.id,
  jsonb_build_object(
    'version', 1,
    'skills', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'name', COALESCE(s->>'name', ''),
               'level', COALESCE(ROUND((s->>'level')::numeric)::int, 0)))
      FROM jsonb_array_elements(
             CASE WHEN jsonb_typeof(c.skills) = 'array' THEN c.skills ELSE '[]'::jsonb END) s
      WHERE COALESCE(s->>'name', '') <> ''
    ), '[]'::jsonb),
    'weapons', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'name', COALESCE(w.name, ''),
               'damage', COALESCE(w.damage, ''),
               'range', COALESCE(w.range, ''),
               'kg', w.weight,
               'cost', ROUND(w.cost)::bigint,
               'notes', COALESCE(w.notes, ''))
             ORDER BY w.created_at)
      FROM public.character_weapons w WHERE w.character_id = c.id
    ), '[]'::jsonb),
    'ammo', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'name', COALESCE(a.type, ''),
               'rounds', GREATEST(COALESCE(a.quantity, 0), 0),
               'capacity', CASE WHEN a.max_quantity > 0 THEN a.max_quantity END,
               'weapon', COALESCE(a.weapon_compatibility, ''),
               'notes', COALESCE(a.notes, ''))
             ORDER BY a.created_at)
      FROM public.character_ammo a WHERE a.character_id = c.id
    ), '[]'::jsonb),
    'armour', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'name', COALESCE(r.name, ''),
               'protection', COALESCE(r.protection, 0),
               'kg', r.weight,
               'cost', ROUND(r.cost)::bigint,
               'worn', true,
               'notes', COALESCE(r.notes, ''))
             ORDER BY r.created_at)
      FROM public.character_armour r WHERE r.character_id = c.id
    ), '[]'::jsonb),
    'gear', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'name', COALESCE(i.item_name, ''),
               'quantity', GREATEST(COALESCE(i.quantity, 1), 0),
               'kg', i.weight,
               'cost', ROUND(i.value)::bigint,
               'notes', COALESCE(i.description, ''))
             ORDER BY i.created_at)
      FROM public.character_inventory i WHERE i.character_id = c.id
    ), '[]'::jsonb),
    'finances', jsonb_build_object(
      'cash', COALESCE((
        SELECT ROUND(SUM(f.amount))::bigint
        FROM public.character_finance f WHERE f.character_id = c.id
      ), 0),
      'ledger', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
                 'date', COALESCE(to_char(f.transaction_date, 'YYYY-MM-DD'), ''),
                 'description', COALESCE(f.description, ''),
                 'amount', ROUND(COALESCE(f.amount, 0))::bigint)
               ORDER BY f.transaction_date, f.created_at)
        FROM public.character_finance f WHERE f.character_id = c.id
      ), '[]'::jsonb)
    )
  )
FROM public.characters c
ON CONFLICT (character_id) DO NOTHING;

COMMIT;
