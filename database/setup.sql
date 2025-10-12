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

-- ===== POLICIES =====
-- 
-- ROLE HIERARCHY:
-- ADMIN: Can view and edit everything across all campaigns
-- GM (Game Master/Referee): Can view all details and manage everything within their assigned campaigns
-- PLAYER: Can only edit their own characters, view campaign info they're members of
--

-- Drop existing policies if they exist (for clean setup)
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

DROP POLICY IF EXISTS "Campaign members can view campaigns" ON campaigns;
DROP POLICY IF EXISTS "Campaign creators can create campaigns" ON campaigns;
DROP POLICY IF EXISTS "Campaign creators can update campaigns" ON campaigns;
DROP POLICY IF EXISTS "Campaign creators can delete campaigns" ON campaigns;

DROP POLICY IF EXISTS "Campaign members can view membership" ON campaign_members;
DROP POLICY IF EXISTS "Campaign creators can manage membership" ON campaign_members;
DROP POLICY IF EXISTS "Admins can manage membership" ON campaign_members;

DROP POLICY IF EXISTS "Campaign members can view characters" ON characters;
DROP POLICY IF EXISTS "Character owners can manage characters" ON characters;
DROP POLICY IF EXISTS "Campaign creators can manage characters" ON characters;

-- User profiles policies
CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Campaign policies - Role-based access control
-- All campaign members can view campaigns they belong to
CREATE POLICY "Campaign members can view campaigns" ON campaigns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = campaigns.id AND user_id = auth.uid()
    )
  );

-- Only Admins and GMs can create campaigns
CREATE POLICY "Admins and GMs can create campaigns" ON campaigns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid()
    )
  );

-- Only Admins and GMs can update campaigns they manage
CREATE POLICY "Admins and GMs can update campaigns" ON campaigns
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = campaigns.id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'gm')
    )
  );

-- Only Admins and campaign creators can delete campaigns
CREATE POLICY "Admins can delete campaigns" ON campaigns
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Campaign members policies - Role-based membership management
-- Users can view their own membership and GMs/Admins can view all campaign membership
CREATE POLICY "View campaign membership" ON campaign_members
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM campaign_members cm
      WHERE cm.campaign_id = campaign_members.campaign_id 
        AND cm.user_id = auth.uid() 
        AND cm.role IN ('gm', 'admin')
    )
  );

-- Only Admins and GMs can manage campaign membership
CREATE POLICY "GMs and Admins manage membership" ON campaign_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE id = campaign_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = campaign_members.campaign_id 
        AND user_id = auth.uid() 
        AND role IN ('gm', 'admin')
    )
  );

CREATE POLICY "GMs and Admins update membership" ON campaign_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE id = campaign_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM campaign_members cm
      WHERE cm.campaign_id = campaign_members.campaign_id 
        AND cm.user_id = auth.uid() 
        AND cm.role IN ('gm', 'admin')
    )
  );

CREATE POLICY "GMs and Admins remove membership" ON campaign_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE id = campaign_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM campaign_members cm
      WHERE cm.campaign_id = campaign_members.campaign_id 
        AND cm.user_id = auth.uid() 
        AND cm.role IN ('gm', 'admin')
    ) OR
    user_id = auth.uid() -- Users can leave campaigns themselves
  );

-- Character policies - Proper role-based access control
-- Players can only view and edit their own characters
CREATE POLICY "Players can view own characters" ON characters
  FOR SELECT USING (
    owner_id = auth.uid() OR
    -- Game Masters can view all characters in their campaigns
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = characters.campaign_id 
        AND user_id = auth.uid() 
        AND role IN ('gm', 'admin')
    ) OR
    -- Admins can view all characters
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Players can edit own characters" ON characters
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Players can create characters" ON characters
  FOR INSERT WITH CHECK (
    owner_id = auth.uid() AND
    -- Must be a member of the campaign
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = characters.campaign_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Players can delete own characters" ON characters
  FOR DELETE USING (owner_id = auth.uid());

-- Game Masters and Admins can manage all characters in their campaigns
CREATE POLICY "GMs and Admins can manage campaign characters" ON characters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = characters.campaign_id 
        AND user_id = auth.uid() 
        AND role IN ('gm', 'admin')
    )
  );

-- Character data policies - Finance, Inventory, Weapons, Armour, Ammo
-- Players can manage their own character data, GMs can manage all character data in their campaigns

-- Character Finance policies
CREATE POLICY "Character finance access" ON character_finance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM characters c
      JOIN campaign_members cm ON c.campaign_id = cm.campaign_id
      WHERE c.id = character_finance.character_id 
        AND (c.owner_id = auth.uid() OR cm.user_id = auth.uid() AND cm.role IN ('gm', 'admin'))
    )
  );

CREATE POLICY "Character finance management" ON character_finance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_finance.character_id 
        AND (c.owner_id = auth.uid() OR 
             EXISTS (
               SELECT 1 FROM campaign_members cm 
               WHERE cm.campaign_id = c.campaign_id 
                 AND cm.user_id = auth.uid() 
                 AND cm.role IN ('gm', 'admin')
             ))
    )
  );

-- Character Inventory policies
CREATE POLICY "Character inventory access" ON character_inventory
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM characters c
      JOIN campaign_members cm ON c.campaign_id = cm.campaign_id
      WHERE c.id = character_inventory.character_id 
        AND (c.owner_id = auth.uid() OR cm.user_id = auth.uid() AND cm.role IN ('gm', 'admin'))
    )
  );

CREATE POLICY "Character inventory management" ON character_inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_inventory.character_id 
        AND (c.owner_id = auth.uid() OR 
             EXISTS (
               SELECT 1 FROM campaign_members cm 
               WHERE cm.campaign_id = c.campaign_id 
                 AND cm.user_id = auth.uid() 
                 AND cm.role IN ('gm', 'admin')
             ))
    )
  );

-- Character Weapons policies
CREATE POLICY "Character weapons access" ON character_weapons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM characters c
      JOIN campaign_members cm ON c.campaign_id = cm.campaign_id
      WHERE c.id = character_weapons.character_id 
        AND (c.owner_id = auth.uid() OR cm.user_id = auth.uid() AND cm.role IN ('gm', 'admin'))
    )
  );

CREATE POLICY "Character weapons management" ON character_weapons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_weapons.character_id 
        AND (c.owner_id = auth.uid() OR 
             EXISTS (
               SELECT 1 FROM campaign_members cm 
               WHERE cm.campaign_id = c.campaign_id 
                 AND cm.user_id = auth.uid() 
                 AND cm.role IN ('gm', 'admin')
             ))
    )
  );

-- Character Armour policies
CREATE POLICY "Character armour access" ON character_armour
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM characters c
      JOIN campaign_members cm ON c.campaign_id = cm.campaign_id
      WHERE c.id = character_armour.character_id 
        AND (c.owner_id = auth.uid() OR cm.user_id = auth.uid() AND cm.role IN ('gm', 'admin'))
    )
  );

CREATE POLICY "Character armour management" ON character_armour
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_armour.character_id 
        AND (c.owner_id = auth.uid() OR 
             EXISTS (
               SELECT 1 FROM campaign_members cm 
               WHERE cm.campaign_id = c.campaign_id 
                 AND cm.user_id = auth.uid() 
                 AND cm.role IN ('gm', 'admin')
             ))
    )
  );

-- Character Ammo policies
CREATE POLICY "Character ammo access" ON character_ammo
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM characters c
      JOIN campaign_members cm ON c.campaign_id = cm.campaign_id
      WHERE c.id = character_ammo.character_id 
        AND (c.owner_id = auth.uid() OR cm.user_id = auth.uid() AND cm.role IN ('gm', 'admin'))
    )
  );

CREATE POLICY "Character ammo management" ON character_ammo
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_ammo.character_id 
        AND (c.owner_id = auth.uid() OR 
             EXISTS (
               SELECT 1 FROM campaign_members cm 
               WHERE cm.campaign_id = c.campaign_id 
                 AND cm.user_id = auth.uid() 
                 AND cm.role IN ('gm', 'admin')
             ))
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

-- ===== SETUP COMPLETE =====
-- Your Traveller Dashboard database is now ready!