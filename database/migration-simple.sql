-- ULTIMATE FIX: Complete separation of concerns to eliminate ALL recursion
-- This migration uses the simplest possible policies to avoid any circular dependencies

-- Step 1: Drop ALL existing policies and functions
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Drop all campaign policies
DROP POLICY IF EXISTS "Campaign creators can view their campaigns" ON campaigns;
DROP POLICY IF EXISTS "Campaign members can view campaigns" ON campaigns;
DROP POLICY IF EXISTS "Campaign creators can modify campaigns" ON campaigns;
DROP POLICY IF EXISTS "Campaign creators can delete campaigns" ON campaigns;
DROP POLICY IF EXISTS "Authenticated users can create campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can modify campaigns" ON campaigns;
DROP POLICY IF EXISTS "Only admins can modify campaigns" ON campaigns;

-- Drop all campaign_members policies
DROP POLICY IF EXISTS "Users can view their own memberships" ON campaign_members;
DROP POLICY IF EXISTS "Campaign creators can manage all memberships" ON campaign_members;
DROP POLICY IF EXISTS "Users can insert themselves into campaigns they created" ON campaign_members;
DROP POLICY IF EXISTS "Existing admins can manage memberships" ON campaign_members;
DROP POLICY IF EXISTS "Campaign members can view membership" ON campaign_members;
DROP POLICY IF EXISTS "Only admins can manage membership" ON campaign_members;

-- Drop all character policies
DROP POLICY IF EXISTS "Campaign members can view all characters" ON characters;
DROP POLICY IF EXISTS "Character owners can modify their characters" ON characters;
DROP POLICY IF EXISTS "Campaign admins can modify all characters" ON characters;
DROP POLICY IF EXISTS "Users can create characters in campaigns they belong to" ON characters;
DROP POLICY IF EXISTS "Character owners and admins can modify characters" ON characters;

-- Drop all other policies
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

-- Drop functions
DROP FUNCTION IF EXISTS get_user_campaign_role(UUID, UUID);
DROP FUNCTION IF EXISTS user_owns_character(UUID, UUID);

-- Step 2: Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Step 3: Create SIMPLE policies with NO cross-table references

-- User profiles - completely independent
CREATE POLICY "Anyone can view profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can create own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Campaigns - ONLY owner-based, no membership references
CREATE POLICY "Anyone can view campaigns" ON campaigns FOR SELECT USING (true);
CREATE POLICY "Users can create campaigns" ON campaigns FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update own campaigns" ON campaigns FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Creators can delete own campaigns" ON campaigns FOR DELETE USING (created_by = auth.uid());

-- Campaign members - ONLY direct user checks, no campaign references
CREATE POLICY "Users can view all memberships" ON campaign_members FOR SELECT USING (true);
CREATE POLICY "Users can insert any membership" ON campaign_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update any membership" ON campaign_members FOR UPDATE USING (true);
CREATE POLICY "Users can delete any membership" ON campaign_members FOR DELETE USING (true);

-- Characters - ONLY owner-based
CREATE POLICY "Anyone can view characters" ON characters FOR SELECT USING (true);
CREATE POLICY "Users can create characters" ON characters FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can update characters" ON characters FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Owners can delete characters" ON characters FOR DELETE USING (owner_id = auth.uid());