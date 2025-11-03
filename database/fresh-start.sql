-- TRAVELLER DASHBOARD - FRESH START
-- Complete database setup from scratch
-- 
-- IMPORTANT: Run this in TWO steps in your Supabase SQL Editor:
-- 1. First run everything up to "PART 1 COMPLETE"
-- 2. Then run everything from "PART 2 START" to the end
-- 
-- This ensures all tables exist before policies reference them.

-- =====================================================================
-- PART 1: CLEAN SLATE & CREATE TABLES
-- =====================================================================

-- =====================================================================
-- STEP 1: Drop everything first
-- =====================================================================

-- Drop all tables
DROP TABLE IF EXISTS campaign_invitations CASCADE;
DROP TABLE IF EXISTS character_ammo CASCADE;
DROP TABLE IF EXISTS character_armour CASCADE;
DROP TABLE IF EXISTS character_weapons CASCADE;
DROP TABLE IF EXISTS character_inventory CASCADE;
DROP TABLE IF EXISTS character_finance CASCADE;
DROP TABLE IF EXISTS characters CASCADE;
DROP TABLE IF EXISTS campaign_members CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop all views
DROP VIEW IF EXISTS campaign_with_members CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS get_user_invitations(TEXT);
DROP FUNCTION IF EXISTS accept_invitation(UUID);
DROP FUNCTION IF EXISTS create_user_profile(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_user_profile_data(UUID);
DROP FUNCTION IF EXISTS create_standalone_character(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS accept_campaign_invitation(UUID);
DROP FUNCTION IF EXISTS decline_campaign_invitation(UUID);
DROP FUNCTION IF EXISTS debug_campaign_permissions();
DROP FUNCTION IF EXISTS get_user_campaign_role(UUID, UUID);
DROP FUNCTION IF EXISTS update_user_profile(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_user_campaigns(UUID);
DROP FUNCTION IF EXISTS get_campaign_members(UUID);
DROP FUNCTION IF EXISTS can_manage_campaign(UUID, UUID);
DROP FUNCTION IF EXISTS get_character_equipment(UUID);
DROP FUNCTION IF EXISTS get_character_finances(UUID);
DROP FUNCTION IF EXISTS get_user_campaigns_with_members(UUID);
DROP FUNCTION IF EXISTS get_campaign_with_member_info(UUID, UUID);
DROP FUNCTION IF EXISTS user_has_campaign_access(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_characters(UUID);
DROP FUNCTION IF EXISTS get_character_inventory_summary(UUID);
DROP FUNCTION IF EXISTS handle_campaign_member_role();
DROP FUNCTION IF EXISTS sync_campaign_member_role();

-- Drop all triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_role_insert ON campaign_members;
DROP TRIGGER IF EXISTS campaign_member_role_sync ON campaign_members;

-- Drop types
DROP TYPE IF EXISTS user_role CASCADE;

-- =====================================================================
-- STEP 2: CREATE TYPES
-- =====================================================================

CREATE TYPE user_role AS ENUM ('admin', 'gm', 'player');

-- =====================================================================
-- STEP 3: CREATE TABLES
-- =====================================================================

-- User Profiles
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  username TEXT,
  profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]{3,30}$' OR username IS NULL)
);

CREATE UNIQUE INDEX user_profiles_username_unique ON user_profiles (username) WHERE username IS NOT NULL;

-- Campaigns
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Members (with both role and boolean columns for compatibility)
CREATE TABLE campaign_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT, -- For app compatibility ('admin', 'gm', 'player')
  is_admin BOOLEAN DEFAULT FALSE,
  is_gm BOOLEAN DEFAULT FALSE,
  is_player BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, user_id)
);

-- Characters
CREATE TABLE characters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  player_name TEXT,
  character_name TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Character Finance
CREATE TABLE character_finance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Character Inventory
CREATE TABLE character_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  weight DECIMAL(8,2),
  value DECIMAL(10,2),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Character Weapons
CREATE TABLE character_weapons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  damage TEXT,
  range TEXT,
  weight DECIMAL(8,2),
  cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Character Armour
CREATE TABLE character_armour (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  protection INTEGER,
  weight DECIMAL(8,2),
  cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Character Ammo
CREATE TABLE character_ammo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  max_quantity INTEGER,
  weapon_compatibility TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Invitations
CREATE TABLE campaign_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  invited_email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  roles_offered JSONB NOT NULL DEFAULT '{"isAdmin": false, "isGm": false, "isPlayer": true}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(campaign_id, invited_email)
);

-- =====================================================================
-- STEP 4: CREATE TRIGGER FOR ROLE SYNC
-- =====================================================================

CREATE OR REPLACE FUNCTION handle_campaign_member_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync role column to boolean columns
  IF NEW.role = 'admin' THEN
    NEW.is_admin := TRUE;
    NEW.is_gm := FALSE;
    NEW.is_player := FALSE;
  ELSIF NEW.role = 'gm' THEN
    NEW.is_admin := FALSE;
    NEW.is_gm := TRUE;
    NEW.is_player := FALSE;
  ELSIF NEW.role = 'player' THEN
    NEW.is_admin := FALSE;
    NEW.is_gm := FALSE;
    NEW.is_player := TRUE;
  -- Sync boolean columns to role column
  ELSIF NEW.is_admin THEN
    NEW.role := 'admin';
  ELSIF NEW.is_gm THEN
    NEW.role := 'gm';
  ELSIF NEW.is_player THEN
    NEW.role := 'player';
  END IF;
  
  -- Ensure at least one role is set
  IF NEW.role IS NULL AND NOT (NEW.is_admin OR NEW.is_gm OR NEW.is_player) THEN
    NEW.role := 'player';
    NEW.is_player := TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_role_insert
  BEFORE INSERT OR UPDATE ON campaign_members
  FOR EACH ROW
  EXECUTE FUNCTION handle_campaign_member_role();

-- =====================================================================
-- PART 1 COMPLETE - All tables and basic structure created
-- =====================================================================
SELECT 'PART 1 COMPLETE: Tables created. Now run PART 2 to add policies and functions.' as status;

-- =====================================================================
-- PART 2: POLICIES AND FUNCTIONS
-- =====================================================================
-- Run this section AFTER Part 1 completes successfully

-- =====================================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
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
-- STEP 6: CREATE SIMPLE, NON-RECURSIVE POLICIES
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
-- STEP 7: CREATE ESSENTIAL FUNCTIONS
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
DROP FUNCTION IF EXISTS get_user_invitations(TEXT);

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
-- STEP 8: SUCCESS MESSAGE
-- =====================================================================

SELECT 'Fresh Traveller Dashboard database created successfully!' as status;
SELECT 'Database is ready with clean schema, policies, and functions.' as message;
SELECT 'Ready to integrate with Brevo email service for invitations.' as note;