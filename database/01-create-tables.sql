-- TRAVELLER DASHBOARD - DATABASE SETUP PART 1
-- Creates all tables, types, and basic structure
-- 
-- Run this file FIRST, then run 02-policies-functions.sql
-- This ensures all tables exist before policies reference them.

-- =====================================================================
-- STEP 1: Drop everything first (clean slate)
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
-- SUCCESS MESSAGE
-- =====================================================================

SELECT 'Part 1 Complete: All tables and triggers created.' as status;
SELECT 'Next: Run 02-policies-functions.sql to add RLS policies and functions.' as next_step;
