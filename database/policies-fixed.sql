-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Campaign members can view campaigns" ON campaigns;
DROP POLICY IF EXISTS "Only admins can modify campaigns" ON campaigns;
DROP POLICY IF EXISTS "Campaign members can view membership" ON campaign_members;
DROP POLICY IF EXISTS "Only admins can manage membership" ON campaign_members;
DROP POLICY IF EXISTS "Campaign members can view all characters" ON characters;
DROP POLICY IF EXISTS "Character owners and admins can modify characters" ON characters;

-- Drop existing functions
DROP FUNCTION IF EXISTS get_user_campaign_role(UUID, UUID);
DROP FUNCTION IF EXISTS user_owns_character(UUID, UUID);

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- User profiles policies (simple, no dependencies)
CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Campaign members policies (no function dependencies to avoid recursion)
CREATE POLICY "Users can view their own memberships" ON campaign_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Campaign creators can manage all memberships" ON campaign_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE id = campaign_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can manage memberships" ON campaign_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaign_members cm
      WHERE cm.campaign_id = campaign_members.campaign_id 
      AND cm.user_id = auth.uid() 
      AND cm.role = 'admin'
    )
  );

-- Campaign policies (using direct queries instead of functions)
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