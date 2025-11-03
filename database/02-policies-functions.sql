-- TRAVELLER DASHBOARD - DATABASE SETUP PART 2
-- Creates Row Level Security policies and essential functions
-- 
-- Run this file AFTER 01-create-tables.sql completes successfully
-- This ensures all tables exist before policies reference them.

-- =====================================================================
-- STEP 1: ENABLE ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_finance ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_weapons ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_armour ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_ammo ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_invitations ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- STEP 2: CREATE SIMPLE, NON-RECURSIVE POLICIES
-- =====================================================================

-- User Profiles Policies
CREATE POLICY "Users can view all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON user_profiles FOR DELETE USING (auth.uid() = id);

-- Campaigns Policies (simple, no recursion)
CREATE POLICY "Authenticated users can create campaigns" ON campaigns FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view campaigns they created" ON campaigns FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Campaign creators can update" ON campaigns FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Campaign creators can delete" ON campaigns FOR DELETE USING (created_by = auth.uid());

-- Campaign Members Policies
CREATE POLICY "Authenticated users can insert members" ON campaign_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view all members" ON campaign_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own membership" ON campaign_members FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Campaign creators can delete members" ON campaign_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM campaigns WHERE id = campaign_members.campaign_id AND created_by = auth.uid())
);

-- Add additional campaign view policy (after campaign_members exists)
CREATE POLICY "Users can view campaigns they joined" ON campaigns FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaign_members WHERE campaign_id = campaigns.id AND user_id = auth.uid())
);

-- Characters Policies
CREATE POLICY "Users can create characters" ON characters FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can view own characters" ON characters FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Campaign members can view characters" ON characters FOR SELECT USING (
  campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own characters" ON characters FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own characters" ON characters FOR DELETE USING (owner_id = auth.uid());

-- Character Data Policies (simple pattern for all)
CREATE POLICY "Character owners manage finance" ON character_finance FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE id = character_finance.character_id AND owner_id = auth.uid())
);

CREATE POLICY "Character owners manage inventory" ON character_inventory FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE id = character_inventory.character_id AND owner_id = auth.uid())
);

CREATE POLICY "Character owners manage weapons" ON character_weapons FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE id = character_weapons.character_id AND owner_id = auth.uid())
);

CREATE POLICY "Character owners manage armour" ON character_armour FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE id = character_armour.character_id AND owner_id = auth.uid())
);

CREATE POLICY "Character owners manage ammo" ON character_ammo FOR ALL USING (
  EXISTS (SELECT 1 FROM characters WHERE id = character_ammo.character_id AND owner_id = auth.uid())
);

-- Campaign Invitations Policies
CREATE POLICY "Campaign creators manage invitations" ON campaign_invitations FOR ALL USING (
  EXISTS (SELECT 1 FROM campaigns WHERE id = campaign_invitations.campaign_id AND created_by = auth.uid())
);
CREATE POLICY "Users can view their invitations" ON campaign_invitations FOR SELECT USING (
  invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- =====================================================================
-- STEP 3: CREATE ESSENTIAL FUNCTIONS
-- =====================================================================

-- Get user profile data
CREATE OR REPLACE FUNCTION public.get_user_profile_data(user_uuid UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'id', id,
      'email', email,
      'display_name', display_name,
      'username', username,
      'profile_completed', COALESCE(profile_completed, false),
      'created_at', created_at,
      'updated_at', updated_at
    )
    FROM user_profiles
    WHERE id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user profile
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  user_email TEXT,
  display_name TEXT DEFAULT NULL,
  username TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  INSERT INTO user_profiles (id, email, display_name, username, profile_completed)
  VALUES (user_id, user_email, display_name, username, (display_name IS NOT NULL AND username IS NOT NULL))
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
    username = COALESCE(EXCLUDED.username, user_profiles.username),
    profile_completed = (
      COALESCE(EXCLUDED.display_name, user_profiles.display_name) IS NOT NULL AND 
      COALESCE(EXCLUDED.username, user_profiles.username) IS NOT NULL
    ),
    updated_at = NOW()
  RETURNING json_build_object(
    'id', id,
    'email', email,
    'display_name', display_name,
    'username', username,
    'profile_completed', profile_completed,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create standalone character
CREATE OR REPLACE FUNCTION public.create_standalone_character(
  user_id UUID,
  char_name TEXT,
  player_name TEXT DEFAULT NULL,
  character_name TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  new_character_id UUID;
  result JSON;
BEGIN
  INSERT INTO characters (campaign_id, name, player_name, character_name, owner_id)
  VALUES (NULL, char_name, player_name, character_name, user_id)
  RETURNING id INTO new_character_id;
  
  SELECT json_build_object(
    'id', c.id,
    'campaign_id', c.campaign_id,
    'name', c.name,
    'player_name', c.player_name,
    'character_name', c.character_name,
    'owner_id', c.owner_id,
    'created_at', c.created_at,
    'updated_at', c.updated_at
  )
  INTO result
  FROM characters c
  WHERE c.id = new_character_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user invitations (with correct parameter name)
CREATE OR REPLACE FUNCTION get_user_invitations(
  p_user_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  campaign_id UUID,
  campaign_name TEXT,
  invited_by_name TEXT,
  roles_offered JSONB,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF p_user_email IS NOT NULL THEN
    v_email := p_user_email;
  ELSE
    SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  END IF;

  IF v_email IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    ci.id,
    ci.campaign_id,
    c.name as campaign_name,
    COALESCE(up.display_name, up.email) as invited_by_name,
    ci.roles_offered,
    NULL::timestamptz as expires_at,
    ci.created_at
  FROM campaign_invitations ci
  JOIN campaigns c ON ci.campaign_id = c.id
  LEFT JOIN user_profiles up ON ci.invited_by = up.id
  WHERE ci.invited_email = v_email
  AND ci.status = 'pending'
  ORDER BY ci.created_at DESC;
END;
$$;

-- Accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(invitation_id UUID)
RETURNS JSON AS $$
DECLARE
  invitation RECORD;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  SELECT * INTO invitation
  FROM campaign_invitations
  WHERE id = invitation_id
  AND invited_email = (SELECT email FROM auth.users WHERE id = current_user_id)
  AND status = 'pending';
  
  IF invitation.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found');
  END IF;
  
  -- Add to campaign with the invited roles
  INSERT INTO campaign_members (campaign_id, user_id, is_admin, is_gm, is_player)
  VALUES (
    invitation.campaign_id, 
    current_user_id,
    (invitation.roles_offered->>'isAdmin')::boolean,
    (invitation.roles_offered->>'isGm')::boolean,
    (invitation.roles_offered->>'isPlayer')::boolean
  )
  ON CONFLICT (campaign_id, user_id) DO NOTHING;
  
  -- Mark accepted
  UPDATE campaign_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = invitation_id;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user campaign role
CREATE OR REPLACE FUNCTION get_user_campaign_role(campaign_uuid UUID, user_uuid UUID)
RETURNS user_role AS $$
DECLARE
  member_record RECORD;
BEGIN
  SELECT is_admin, is_gm, is_player INTO member_record
  FROM campaign_members
  WHERE campaign_id = campaign_uuid AND user_id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  IF member_record.is_admin THEN
    RETURN 'admin'::user_role;
  ELSIF member_record.is_gm THEN
    RETURN 'gm'::user_role;
  ELSIF member_record.is_player THEN
    RETURN 'player'::user_role;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================

SELECT 'Part 2 Complete: All RLS policies and functions created.' as status;
SELECT 'Fresh Traveller Dashboard database ready!' as message;
SELECT 'Database is ready to use with Brevo email service for invitations.' as note;
