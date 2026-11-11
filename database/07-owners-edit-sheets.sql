-- =====================================================================
-- 07: Players manage their own sheets
--
-- Migration 06 let the campaign's referee edit players' sheets. Players
-- manage their own: the referee can still read them, and keeps their
-- private referee notes, but only the character's owner can create or
-- change its sheet (characters rows were already owner-only).
--
-- Safe to re-run.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.owns_character(p_character_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.characters c
    WHERE c.id = p_character_id AND c.owner_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.owns_character(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_character(UUID) TO authenticated;

-- Reading is unchanged: owner and referee (public.can_access_sheet).

DROP POLICY IF EXISTS "Owner and referee create sheets" ON public.character_sheets;
DROP POLICY IF EXISTS "Owners create sheets" ON public.character_sheets;
CREATE POLICY "Owners create sheets"
  ON public.character_sheets FOR INSERT TO authenticated
  WITH CHECK (public.owns_character(character_id));

DROP POLICY IF EXISTS "Owner and referee update sheets" ON public.character_sheets;
DROP POLICY IF EXISTS "Owners update sheets" ON public.character_sheets;
CREATE POLICY "Owners update sheets"
  ON public.character_sheets FOR UPDATE TO authenticated
  USING (public.owns_character(character_id))
  WITH CHECK (public.owns_character(character_id));

COMMIT;
