-- TRAVELLER DASHBOARD - SECURITY HARDENING
--
-- Run AFTER 01-04. Safe to re-run (idempotent) and written to cope with schema
-- drift: it drops *every* existing policy on the tables it secures (whatever
-- their names in the live DB) and recreates a known-good set.
--
-- Closes:
--   * any user could INSERT themselves into any campaign as admin
--   * members could UPDATE their own membership to admin
--   * self-referencing campaign_members policy (infinite recursion)
--   * user_profiles (incl. every email) readable by anyone, even anon
--   * SECURITY DEFINER RPCs that trusted caller-supplied user ids / emails
--   * characters could be created in, or moved into, campaigns you aren't in
--   * invitation policy that read auth.users (permission denied for clients)
--   * role-sync trigger silently undoing boolean role changes (admins could
--     never be demoted)
--
-- Behaviour changes to be aware of:
--   * Profiles are only visible to yourself and people you share a campaign
--     with. "Add member by email" for a user you don't share a campaign with
--     now goes through the invitation flow (they must accept) instead of
--     silently adding them.
--   * Only campaign admins (or the creator) can add/update/remove members.
--     Members can still leave a campaign themselves.
--   * Invitations expire after 14 days.
--
-- NOTE: the invite-user Edge Function uses the service-role key and bypasses
-- all of this. It must verify the caller separately.

BEGIN;

-- =====================================================================
-- STEP 1: HELPERS
-- SECURITY DEFINER so policies can consult campaign_members without
-- recursing into campaign_members' own RLS. search_path pinned to ''.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_campaign_member(p_campaign_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaign_members m
    WHERE m.campaign_id = p_campaign_id AND m.user_id = auth.uid()
  );
$$;

-- Creator of the campaign, or a member flagged is_admin.
CREATE OR REPLACE FUNCTION public.is_campaign_admin(p_campaign_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = p_campaign_id AND c.created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.campaign_members m
    WHERE m.campaign_id = p_campaign_id AND m.user_id = auth.uid() AND m.is_admin
  );
$$;

CREATE OR REPLACE FUNCTION public.campaign_creator(p_campaign_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT created_by FROM public.campaigns WHERE id = p_campaign_id;
$$;

-- True if the caller and p_user_id are members of at least one common campaign.
CREATE OR REPLACE FUNCTION public.shares_campaign_with(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaign_members mine
    JOIN public.campaign_members theirs ON theirs.campaign_id = mine.campaign_id
    WHERE mine.user_id = auth.uid() AND theirs.user_id = p_user_id
  );
$$;

-- Caller's email, read from auth.users (not from client input).
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT lower(email) FROM auth.users WHERE id = auth.uid();
$$;

-- Drops every overload of a public function by name (live signatures may differ).
CREATE OR REPLACE FUNCTION pg_temp.drop_function_overloads(p_name TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = p_name
  LOOP
    EXECUTE format('DROP FUNCTION %s', r.sig);
  END LOOP;
END;
$$;

-- Drops every policy on a table (live policy names may differ from the repo).
CREATE OR REPLACE FUNCTION pg_temp.drop_all_policies(p_table TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = p_table
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, p_table);
  END LOOP;
END;
$$;

-- =====================================================================
-- STEP 2: ROLE-SYNC TRIGGER FIX
-- Booleans are authoritative; `role` is derived (highest role). A `role`
-- value is only used to set the booleans when it's the only thing supplied.
-- =====================================================================

-- Older live schemas lack `role`; the client writes it, and the trigger reads it.
ALTER TABLE public.campaign_members ADD COLUMN IF NOT EXISTS role TEXT;

CREATE OR REPLACE FUNCTION public.handle_campaign_member_role()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.is_admin  := COALESCE(NEW.is_admin, FALSE);
  NEW.is_gm     := COALESCE(NEW.is_gm, FALSE);
  NEW.is_player := COALESCE(NEW.is_player, FALSE);

  IF (TG_OP = 'INSERT' AND NOT (NEW.is_admin OR NEW.is_gm OR NEW.is_player))
     OR (TG_OP = 'UPDATE'
         AND NEW.role IS DISTINCT FROM OLD.role
         AND (NEW.is_admin, NEW.is_gm, NEW.is_player)
             IS NOT DISTINCT FROM (OLD.is_admin, OLD.is_gm, OLD.is_player)) THEN
    NEW.is_admin  := NEW.role = 'admin';
    NEW.is_gm     := NEW.role = 'gm';
    NEW.is_player := NEW.role = 'player';
  END IF;

  IF NOT (NEW.is_admin OR NEW.is_gm OR NEW.is_player) THEN
    NEW.is_player := TRUE;
  END IF;

  NEW.role := CASE
    WHEN NEW.is_admin THEN 'admin'
    WHEN NEW.is_gm THEN 'gm'
    ELSE 'player'
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_role_insert ON public.campaign_members;
DROP TRIGGER IF EXISTS campaign_member_role_sync ON public.campaign_members;
CREATE TRIGGER handle_role_insert
  BEFORE INSERT OR UPDATE ON public.campaign_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_campaign_member_role();

-- =====================================================================
-- STEP 3: USER PROFILES
-- =====================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
SELECT pg_temp.drop_all_policies('user_profiles');

CREATE POLICY "Profiles visible to self and campaign co-members"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.shares_campaign_with(id));

CREATE POLICY "Users update own profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Users delete own profile"
  ON public.user_profiles FOR DELETE TO authenticated
  USING (id = auth.uid());

-- Profiles are created by the on_auth_user_created trigger, so clients get no
-- INSERT, and may only UPDATE the columns the app edits (not id/email).
REVOKE INSERT, UPDATE ON public.user_profiles FROM anon, authenticated;
GRANT UPDATE (display_name, username, profile_completed, updated_at)
  ON public.user_profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, profile_completed)
  VALUES (NEW.id, NEW.email, FALSE)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- =====================================================================
-- STEP 4: CAMPAIGNS
-- =====================================================================

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
SELECT pg_temp.drop_all_policies('campaigns');

CREATE POLICY "Campaigns visible to creator and members"
  ON public.campaigns FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_campaign_member(id));

CREATE POLICY "Users create campaigns as themselves"
  ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creators update campaigns"
  ON public.campaigns FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creators delete campaigns"
  ON public.campaigns FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- =====================================================================
-- STEP 5: CAMPAIGN MEMBERS
-- =====================================================================

ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;
SELECT pg_temp.drop_all_policies('campaign_members');

CREATE POLICY "Members see their campaigns' rosters"
  ON public.campaign_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_campaign_member(campaign_id));

-- Covers the creator adding themselves right after creating a campaign.
-- Invitees join via accept_campaign_invitation(), not direct inserts.
CREATE POLICY "Admins add members"
  ON public.campaign_members FOR INSERT TO authenticated
  WITH CHECK (public.is_campaign_admin(campaign_id));

-- Admins manage roles, but only the creator may modify the creator's row.
CREATE POLICY "Admins update members"
  ON public.campaign_members FOR UPDATE TO authenticated
  USING (
    public.is_campaign_admin(campaign_id)
    AND (user_id <> public.campaign_creator(campaign_id)
         OR auth.uid() = public.campaign_creator(campaign_id))
  )
  WITH CHECK (
    public.is_campaign_admin(campaign_id)
    AND (user_id <> public.campaign_creator(campaign_id)
         OR auth.uid() = public.campaign_creator(campaign_id))
  );

-- Admins remove members (never the creator); anyone may leave.
CREATE POLICY "Admins remove members, members leave"
  ON public.campaign_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (public.is_campaign_admin(campaign_id)
        AND user_id <> public.campaign_creator(campaign_id))
  );

-- =====================================================================
-- STEP 6: CHARACTERS
-- =====================================================================

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
SELECT pg_temp.drop_all_policies('characters');

CREATE POLICY "Characters visible to owner and campaign members"
  ON public.characters FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR (campaign_id IS NOT NULL AND public.is_campaign_member(campaign_id))
  );

CREATE POLICY "Users create own characters in their campaigns"
  ON public.characters FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (campaign_id IS NULL OR public.is_campaign_member(campaign_id))
  );

CREATE POLICY "Owners update own characters"
  ON public.characters FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND (campaign_id IS NULL OR public.is_campaign_member(campaign_id))
  );

CREATE POLICY "Owners and campaign admins delete characters"
  ON public.characters FOR DELETE TO authenticated
  USING (
    owner_id = auth.uid()
    OR (campaign_id IS NOT NULL AND public.is_campaign_admin(campaign_id))
  );

-- =====================================================================
-- STEP 7: INVITATIONS
-- =====================================================================

-- The column may already exist (nullable, no default) in the live DB. Every
-- check below requires expires_at > NOW(), so it must always be set.
ALTER TABLE public.campaign_invitations
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
UPDATE public.campaign_invitations
  SET expires_at = NOW() + INTERVAL '14 days'
  WHERE expires_at IS NULL;
ALTER TABLE public.campaign_invitations
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '14 days'),
  ALTER COLUMN expires_at SET NOT NULL;

ALTER TABLE public.campaign_invitations ENABLE ROW LEVEL SECURITY;
SELECT pg_temp.drop_all_policies('campaign_invitations');

CREATE POLICY "Admins manage campaign invitations"
  ON public.campaign_invitations FOR ALL TO authenticated
  USING (public.is_campaign_admin(campaign_id))
  WITH CHECK (public.is_campaign_admin(campaign_id));

CREATE POLICY "Invitees see their invitations"
  ON public.campaign_invitations FOR SELECT TO authenticated
  USING (lower(invited_email) = public.current_user_email());

-- Legacy table (not in repo SQL, may exist in the live DB). Lock it down the
-- same way if present; the current UI doesn't use it.
DO $$
BEGIN
  IF to_regclass('public.pending_invitations') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY';
    PERFORM pg_temp.drop_all_policies('pending_invitations');
    EXECUTE $p$
      CREATE POLICY "Admins manage pending invitations"
        ON public.pending_invitations FOR ALL TO authenticated
        USING (public.is_campaign_admin(campaign_id))
        WITH CHECK (public.is_campaign_admin(campaign_id))
    $p$;
    EXECUTE $p$
      CREATE POLICY "Invitees see pending invitations"
        ON public.pending_invitations FOR SELECT TO authenticated
        USING (lower(email) = public.current_user_email())
    $p$;
  END IF;
END;
$$;

-- =====================================================================
-- STEP 8: RPC FUNCTIONS
-- Drop RPCs the client doesn't call (attack surface, several trusted
-- caller-supplied ids), and rebuild the ones it does with caller checks.
-- =====================================================================

SELECT pg_temp.drop_function_overloads(f) FROM unnest(ARRAY[
  'create_user_profile',
  'get_user_profile_data',
  'get_user_campaign_role',
  'get_campaign_data',
  'accept_invitation',
  'create_campaign_invitation',
  'send_campaign_invitation',
  'debug_campaign_permissions',
  -- rebuilt below (return types / arg names may differ in the live DB)
  'create_standalone_character',
  'get_user_invitations',
  'accept_campaign_invitation',
  'decline_campaign_invitation'
]) AS f;

-- user_id is kept for client compatibility but must be the caller.
CREATE FUNCTION public.create_standalone_character(
  user_id UUID,
  char_name TEXT,
  player_name TEXT DEFAULT NULL,
  character_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  result JSON;
BEGIN
  IF auth.uid() IS NULL OR user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.characters AS c (campaign_id, name, player_name, character_name, owner_id)
  VALUES (NULL, char_name, player_name, character_name, auth.uid())
  RETURNING json_build_object(
    'id', c.id, 'campaign_id', c.campaign_id, 'name', c.name,
    'player_name', c.player_name, 'character_name', c.character_name,
    'owner_id', c.owner_id, 'characteristics', c.characteristics,
    'skills', c.skills, 'created_at', c.created_at, 'updated_at', c.updated_at
  ) INTO result;

  RETURN result;
END;
$$;

-- p_user_email is ignored: always the caller's own invitations.
CREATE FUNCTION public.get_user_invitations(p_user_email TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  campaign_id UUID,
  campaign_name TEXT,
  campaign_description TEXT,
  invited_email TEXT,
  invited_by UUID,
  inviter_name TEXT,
  inviter_email TEXT,
  roles_offered JSONB,
  status TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    ci.id, ci.campaign_id, c.name, c.description, ci.invited_email, ci.invited_by,
    COALESCE(up.display_name, up.username, 'A fellow traveller'),
    NULL::TEXT,            -- inviter email deliberately not exposed
    ci.roles_offered, ci.status, ci.expires_at, ci.created_at
  FROM public.campaign_invitations ci
  JOIN public.campaigns c ON c.id = ci.campaign_id
  LEFT JOIN public.user_profiles up ON up.id = ci.invited_by
  WHERE lower(ci.invited_email) = public.current_user_email()
    AND ci.status = 'pending'
    AND ci.expires_at > NOW()
  ORDER BY ci.created_at DESC;
$$;

-- p_user_id is kept for client compatibility but must be the caller.
CREATE FUNCTION public.accept_campaign_invitation(
  p_invitation_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  inv public.campaign_invitations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR (p_user_id IS NOT NULL AND p_user_id <> auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO inv
  FROM public.campaign_invitations
  WHERE id = p_invitation_id
    AND lower(invited_email) = public.current_user_email()
    AND status = 'pending'
    AND expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or expired' USING ERRCODE = 'P0002';
  END IF;

  -- Explicit check rather than ON CONFLICT: the live DB may lack the
  -- (campaign_id, user_id) unique constraint. The row lock above serialises
  -- concurrent accepts of the same invitation.
  IF NOT EXISTS (
    SELECT 1 FROM public.campaign_members
    WHERE campaign_id = inv.campaign_id AND user_id = auth.uid()
  ) THEN
    INSERT INTO public.campaign_members (campaign_id, user_id, is_admin, is_gm, is_player)
    VALUES (
      inv.campaign_id,
      auth.uid(),
      COALESCE((inv.roles_offered->>'isAdmin')::BOOLEAN, FALSE),
      COALESCE((inv.roles_offered->>'isGm')::BOOLEAN, FALSE),
      COALESCE((inv.roles_offered->>'isPlayer')::BOOLEAN, FALSE)
    );
  END IF;

  UPDATE public.campaign_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = inv.id;

  RETURN TRUE;
END;
$$;

CREATE FUNCTION public.decline_campaign_invitation(p_invitation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.campaign_invitations
  SET status = 'declined'
  WHERE id = p_invitation_id
    AND lower(invited_email) = public.current_user_email()
    AND status = 'pending';
  RETURN FOUND;
END;
$$;

-- =====================================================================
-- STEP 9: FUNCTION PRIVILEGES
-- Supabase grants EXECUTE on public functions to anon by default. Revoke
-- everything, then grant only what the client calls (plus policy helpers).
-- Trigger functions don't need EXECUTE grants to fire.
-- =====================================================================

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.is_campaign_member(UUID),
  public.is_campaign_admin(UUID),
  public.campaign_creator(UUID),
  public.shares_campaign_with(UUID),
  public.current_user_email(),
  public.create_standalone_character(UUID, TEXT, TEXT, TEXT),
  public.get_user_invitations(TEXT),
  public.accept_campaign_invitation(UUID, UUID),
  public.decline_campaign_invitation(UUID)
TO authenticated;

COMMIT;

SELECT 'Security hardening applied.' AS status;
