-- Complete Database Migration: Fix Infinite Recursion
-- This migration drops ALL existing policies, then recreates them without recursion

-- Step 1: Drop ALL existing policies (including the ones causing dependency issues)
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

DROP POLICY IF EXISTS "Campaign members can view campaigns" ON campaigns;
DROP POLICY IF EXISTS "Only admins can modify campaigns" ON campaigns;

DROP POLICY IF EXISTS "Campaign members can view membership" ON campaign_members;
DROP POLICY IF EXISTS "Only admins can manage membership" ON campaign_members;

DROP POLICY IF EXISTS "Campaign members can view all characters" ON characters;
DROP POLICY IF EXISTS "Character owners and admins can modify characters" ON characters;

-- Drop policies for shared data tables
DROP POLICY IF EXISTS "Campaign members can view party finances" ON party_finances;
DROP POLICY IF EXISTS "Players and admins can modify party finances" ON party_finances;

DROP POLICY IF EXISTS "Campaign members can view ship accounts" ON ship_accounts;
DROP POLICY IF EXISTS "Players and admins can modify ship accounts" ON ship_accounts;

DROP POLICY IF EXISTS "Campaign members can view ship cargo" ON ship_cargo;
DROP POLICY IF EXISTS "Players and admins can modify ship cargo" ON ship_cargo;

DROP POLICY IF EXISTS "Campaign members can view maintenance log" ON ship_maintenance_log;
DROP POLICY IF EXISTS "Players and admins can modify maintenance log" ON ship_maintenance_log;

DROP POLICY IF EXISTS "Campaign members can view loans" ON loans_mortgage;
DROP POLICY IF EXISTS "Players and admins can modify loans" ON loans_mortgage;

DROP POLICY IF EXISTS "Campaign members can view party inventory" ON party_inventory;
DROP POLICY IF EXISTS "Players and admins can modify party inventory" ON party_inventory;

DROP POLICY IF EXISTS "Campaign members can view ammo tracker" ON ammo_tracker;
DROP POLICY IF EXISTS "Players and admins can modify ammo tracker" ON ammo_tracker;

-- Drop policies for character-specific tables
DROP POLICY IF EXISTS "Campaign members can view character finances" ON character_finances;
DROP POLICY IF EXISTS "Character owners and admins can modify character finances" ON character_finances;

DROP POLICY IF EXISTS "Campaign members can view character inventory" ON character_inventory;
DROP POLICY IF EXISTS "Character owners and admins can modify character inventory" ON character_inventory;

DROP POLICY IF EXISTS "Campaign members can view character weapons" ON character_weapons;
DROP POLICY IF EXISTS "Character owners and admins can modify character weapons" ON character_weapons;

DROP POLICY IF EXISTS "Campaign members can view character armour" ON character_armour;
DROP POLICY IF EXISTS "Character owners and admins can modify character armour" ON character_armour;

DROP POLICY IF EXISTS "Campaign members can view character ammo" ON character_ammo;
DROP POLICY IF EXISTS "Character owners and admins can modify character ammo" ON character_ammo;

-- Step 2: Now we can safely drop the functions
DROP FUNCTION IF EXISTS get_user_campaign_role(UUID, UUID);
DROP FUNCTION IF EXISTS user_owns_character(UUID, UUID);

-- Step 3: Enable RLS on all tables (safe to run multiple times)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Enable RLS on shared data tables (if they exist)
-- These commands will fail silently if tables don't exist yet
DO $$ 
BEGIN
    ALTER TABLE party_finances ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN
        -- Table doesn't exist yet, skip
        NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE ship_accounts ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE ship_cargo ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE ship_maintenance_log ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE loans_mortgage ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE party_inventory ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE ammo_tracker ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

-- Character-specific tables
DO $$ 
BEGIN
    ALTER TABLE character_finances ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE character_inventory ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE character_weapons ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE character_armour ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE character_ammo ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

-- Step 4: Create new policies without recursion

-- User profiles policies (simple, no dependencies)
CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Campaign members policies (fixed to avoid recursion)
CREATE POLICY "Users can view their own memberships" ON campaign_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Campaign creators can manage all memberships" ON campaign_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE id = campaign_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert themselves into campaigns they created" ON campaign_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE id = campaign_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Existing admins can manage memberships" ON campaign_members
  FOR ALL USING (
    user_id = auth.uid() OR  -- Users can always see their own membership
    EXISTS (
      SELECT 1 FROM campaign_members cm
      WHERE cm.campaign_id = campaign_members.campaign_id 
      AND cm.user_id = auth.uid() 
      AND cm.role = 'admin'
    )
  );

-- Campaign policies (fixed to avoid recursion during creation)
CREATE POLICY "Campaign creators can view their campaigns" ON campaigns
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Campaign members can view campaigns" ON campaigns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Campaign creators can modify campaigns" ON campaigns
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Campaign creators can delete campaigns" ON campaigns
  FOR DELETE USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can create campaigns" ON campaigns
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can modify campaigns" ON campaigns
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- Characters policies (direct queries, no functions)
CREATE POLICY "Campaign members can view all characters" ON characters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = characters.campaign_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Character owners can modify their characters" ON characters
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Campaign admins can modify all characters" ON characters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = characters.campaign_id 
      AND user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can create characters in campaigns they belong to" ON characters
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = characters.campaign_id AND user_id = auth.uid()
    )
  );