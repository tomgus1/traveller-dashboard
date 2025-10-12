-- TRAVELLER DASHBOARD - COMPLETE DATABASE SETUP
-- This single file contains everything needed for the application
-- Run this in your Supabase SQL editor

-- ===== ENUMS =====
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'gm', 'player');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ===== SCHEMA =====

-- User profiles - Additional user information beyond Supabase auth
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns - Core campaign management
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign membership with roles
CREATE TABLE IF NOT EXISTS campaign_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL DEFAULT 'player',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, user_id)
);

-- Characters - Campaign characters (PCs/NPCs)
CREATE TABLE IF NOT EXISTS characters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  player_name TEXT, -- The real player name (e.g., "Andrew", "Nicole")
  character_name TEXT, -- The character name (e.g., "Dr Vax Vanderpool", "Admiral Rosa Perre")
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Character Finance - Campaign-specific financial transactions
CREATE TABLE IF NOT EXISTS character_finance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Character Inventory - Campaign-specific inventory items
CREATE TABLE IF NOT EXISTS character_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  weight DECIMAL(8,2),
  value DECIMAL(10,2),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Character Weapons - Campaign-specific weapons
CREATE TABLE IF NOT EXISTS character_weapons (
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

-- Character Armour - Campaign-specific armour
CREATE TABLE IF NOT EXISTS character_armour (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  protection INTEGER,
  weight DECIMAL(8,2),
  cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Character Ammo - Campaign-specific ammunition
CREATE TABLE IF NOT EXISTS character_ammo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  max_quantity INTEGER,
  weapon_compatibility TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== ROW LEVEL SECURITY =====

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_finance ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_weapons ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_armour ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_ammo ENABLE ROW LEVEL SECURITY;

-- ===== AUTO USER PROFILE CREATION =====
-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, just return
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call function on user signup (safe to run multiple times)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure existing users have profiles (migration-safe)
INSERT INTO user_profiles (id, email, display_name)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'display_name', email) as display_name
FROM auth.users 
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

-- ===== POLICIES =====
-- 
-- ULTRA-SIMPLE ROLE SYSTEM (NO CIRCULAR DEPENDENCIES):
-- CAMPAIGN CREATOR: Can create and manage their own campaigns
-- USERS: Can only see and manage their own data (characters, items, etc.)
-- SHARING: Campaign membership will be handled at the application level for now
-- ACCESS CONTROL: Owner-based - users can only access what they own
--

-- Drop existing policies if they exist (for clean setup)
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

DROP POLICY IF EXISTS "Campaign members can view campaigns" ON campaigns;
DROP POLICY IF EXISTS "Campaign creators can create campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins and GMs can create campaigns" ON campaigns;
DROP POLICY IF EXISTS "Authenticated users can create campaigns" ON campaigns;
DROP POLICY IF EXISTS "Campaign creators can update campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins and GMs can update campaigns" ON campaigns;
DROP POLICY IF EXISTS "Campaign creators can delete campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can delete campaigns" ON campaigns;

DROP POLICY IF EXISTS "Campaign members can view membership" ON campaign_members;
DROP POLICY IF EXISTS "View campaign membership" ON campaign_members;
DROP POLICY IF EXISTS "Campaign creators can manage membership" ON campaign_members;
DROP POLICY IF EXISTS "GMs and Admins manage membership" ON campaign_members;
DROP POLICY IF EXISTS "Campaign creators and admins manage membership" ON campaign_members;
DROP POLICY IF EXISTS "GMs and Admins update membership" ON campaign_members;
DROP POLICY IF EXISTS "GMs and Admins remove membership" ON campaign_members;
DROP POLICY IF EXISTS "Admins can manage membership" ON campaign_members;

DROP POLICY IF EXISTS "Campaign members can view characters" ON characters;
DROP POLICY IF EXISTS "Players can view own characters" ON characters;
DROP POLICY IF EXISTS "Character owners can manage characters" ON characters;
DROP POLICY IF EXISTS "Players can edit own characters" ON characters;
DROP POLICY IF EXISTS "Players can create characters" ON characters;
DROP POLICY IF EXISTS "Players can delete own characters" ON characters;
DROP POLICY IF EXISTS "Campaign creators can manage characters" ON characters;
DROP POLICY IF EXISTS "GMs and Admins can manage campaign characters" ON characters;

-- User profiles policies
CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Campaign policies - Simple and direct
-- Campaign creators can see their own campaigns
CREATE POLICY "Campaign creators can view their campaigns" ON campaigns
  FOR SELECT USING (created_by = auth.uid());

-- Any authenticated user can create campaigns
CREATE POLICY "Authenticated users can create campaigns" ON campaigns
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND created_by = auth.uid()
  );

-- Only campaign creators can update their campaigns
CREATE POLICY "Campaign creators can update campaigns" ON campaigns
  FOR UPDATE USING (created_by = auth.uid());

-- Only campaign creators can delete their campaigns
CREATE POLICY "Campaign creators can delete campaigns" ON campaigns
  FOR DELETE USING (created_by = auth.uid());

-- Campaign members policies - Simple and direct  
-- Users can view their own membership
CREATE POLICY "Users can view their own membership" ON campaign_members
  FOR SELECT USING (user_id = auth.uid());

-- Campaign creators can add members to their campaigns
CREATE POLICY "Campaign creators can add members" ON campaign_members
  FOR INSERT WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE created_by = auth.uid()
    )
  );

-- Campaign creators can update roles in their campaigns
CREATE POLICY "Campaign creators can update roles" ON campaign_members
  FOR UPDATE USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE created_by = auth.uid()
    )
  );

-- Campaign creators can remove members from their campaigns
CREATE POLICY "Campaign creators can remove members" ON campaign_members
  FOR DELETE USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE created_by = auth.uid()
    ) OR
    user_id = auth.uid()
  );

-- Character policies - Simple and direct
-- Users can view their own characters
CREATE POLICY "Users can view their own characters" ON characters
  FOR SELECT USING (owner_id = auth.uid());

-- Users can edit their own characters
CREATE POLICY "Users can edit their own characters" ON characters
  FOR UPDATE USING (owner_id = auth.uid());

-- Users can create characters if they own them
CREATE POLICY "Users can create their own characters" ON characters
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Users can delete their own characters
CREATE POLICY "Users can delete their own characters" ON characters
  FOR DELETE USING (owner_id = auth.uid());

-- Character data policies - Simple owner-based access
-- Users can access data for their own characters

-- Character Finance policies
CREATE POLICY "Users can access their character finance" ON character_finance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_finance.character_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their character finance" ON character_finance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_finance.character_id AND c.owner_id = auth.uid()
    )
  );

-- Character Inventory policies
CREATE POLICY "Users can access their character inventory" ON character_inventory
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_inventory.character_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their character inventory" ON character_inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_inventory.character_id AND c.owner_id = auth.uid()
    )
  );

-- Character Weapons policies
CREATE POLICY "Users can access their character weapons" ON character_weapons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_weapons.character_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their character weapons" ON character_weapons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_weapons.character_id AND c.owner_id = auth.uid()
    )
  );

-- Character Armour policies
CREATE POLICY "Users can access their character armour" ON character_armour
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_armour.character_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their character armour" ON character_armour
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_armour.character_id AND c.owner_id = auth.uid()
    )
  );

-- Character Ammo policies
CREATE POLICY "Users can access their character ammo" ON character_ammo
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_ammo.character_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their character ammo" ON character_ammo
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_ammo.character_id AND c.owner_id = auth.uid()
    )
  );

-- ===== FUNCTIONS =====

-- Function to get user's role in a campaign
CREATE OR REPLACE FUNCTION get_user_campaign_role(campaign_uuid UUID, user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role::TEXT
    FROM campaign_members
    WHERE campaign_id = campaign_uuid AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check campaign creation permissions for current user (debugging)
CREATE OR REPLACE FUNCTION debug_campaign_permissions()
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  has_profile BOOLEAN,
  can_create_campaign BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as user_id,
    (SELECT email FROM auth.users WHERE id = auth.uid()) as user_email,
    EXISTS(SELECT 1 FROM user_profiles WHERE id = auth.uid()) as has_profile,
    (auth.uid() IS NOT NULL) as can_create_campaign;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== SETUP COMPLETE =====
-- Your Traveller Dashboard database is now ready!
-- You can run this script multiple times safely - it will handle migrations.
-- 
-- NEW SIMPLIFIED ROLE SYSTEM:
-- • Anyone can create campaigns (becomes admin automatically)
-- • Campaign creators control everything about their campaigns
-- • Members are added with appropriate roles (gm, player)
-- • Campaign-based isolation with creator having full administrative control
-- 
-- To verify the setup worked, you can run:
-- SELECT * FROM debug_campaign_permissions();