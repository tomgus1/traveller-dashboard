-- Helper function to get user role in campaign
CREATE OR REPLACE FUNCTION get_user_campaign_role(campaign_uuid UUID, user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM campaign_members 
    WHERE campaign_id = campaign_uuid AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user owns character
CREATE OR REPLACE FUNCTION user_owns_character(character_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM characters 
    WHERE id = character_uuid AND owner_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User profiles policies
CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Campaign policies
CREATE POLICY "Campaign members can view campaigns" ON campaigns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can modify campaigns" ON campaigns
  FOR ALL USING (
    get_user_campaign_role(id, auth.uid()) = 'admin'
  );

-- Campaign members policies
CREATE POLICY "Campaign members can view membership" ON campaign_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members cm2
      WHERE cm2.campaign_id = campaign_id AND cm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can manage membership" ON campaign_members
  FOR ALL USING (
    get_user_campaign_role(campaign_id, auth.uid()) = 'admin'
  );

-- Characters policies
CREATE POLICY "Campaign members can view all characters" ON characters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = characters.campaign_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Character owners and admins can modify characters" ON characters
  FOR ALL USING (
    owner_id = auth.uid() OR 
    get_user_campaign_role(campaign_id, auth.uid()) = 'admin'
  );

-- Shared data policies (party_finances, ship_accounts, ship_cargo, etc.)
-- Everyone can read, players and admins can edit

CREATE POLICY "Campaign members can view party finances" ON party_finances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = party_finances.campaign_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Players and admins can modify party finances" ON party_finances
  FOR ALL USING (
    get_user_campaign_role(campaign_id, auth.uid()) IN ('player', 'admin')
  );

-- Repeat similar policies for other shared tables
CREATE POLICY "Campaign members can view ship accounts" ON ship_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = ship_accounts.campaign_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Players and admins can modify ship accounts" ON ship_accounts
  FOR ALL USING (
    get_user_campaign_role(campaign_id, auth.uid()) IN ('player', 'admin')
  );

CREATE POLICY "Campaign members can view ship cargo" ON ship_cargo
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = ship_cargo.campaign_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Players and admins can modify ship cargo" ON ship_cargo
  FOR ALL USING (
    get_user_campaign_role(campaign_id, auth.uid()) IN ('player', 'admin')
  );

CREATE POLICY "Campaign members can view maintenance log" ON ship_maintenance_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = ship_maintenance_log.campaign_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Players and admins can modify maintenance log" ON ship_maintenance_log
  FOR ALL USING (
    get_user_campaign_role(campaign_id, auth.uid()) IN ('player', 'admin')
  );

CREATE POLICY "Campaign members can view loans" ON loans_mortgage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = loans_mortgage.campaign_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Players and admins can modify loans" ON loans_mortgage
  FOR ALL USING (
    get_user_campaign_role(campaign_id, auth.uid()) IN ('player', 'admin')
  );

CREATE POLICY "Campaign members can view party inventory" ON party_inventory
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = party_inventory.campaign_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Players and admins can modify party inventory" ON party_inventory
  FOR ALL USING (
    get_user_campaign_role(campaign_id, auth.uid()) IN ('player', 'admin')
  );

CREATE POLICY "Campaign members can view ammo tracker" ON ammo_tracker
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members 
      WHERE campaign_id = ammo_tracker.campaign_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Players and admins can modify ammo tracker" ON ammo_tracker
  FOR ALL USING (
    get_user_campaign_role(campaign_id, auth.uid()) IN ('player', 'admin')
  );

-- Character-specific data policies
-- Everyone can read, only character owner and admins can edit

CREATE POLICY "Campaign members can view character finances" ON character_finances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members cm
      JOIN characters c ON c.campaign_id = cm.campaign_id
      WHERE c.id = character_finances.character_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Character owners and admins can modify character finances" ON character_finances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM characters c
      JOIN campaign_members cm ON cm.campaign_id = c.campaign_id
      WHERE c.id = character_finances.character_id 
      AND (c.owner_id = auth.uid() OR cm.role = 'admin' AND cm.user_id = auth.uid())
    )
  );

-- Repeat for other character tables
CREATE POLICY "Campaign members can view character inventory" ON character_inventory
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members cm
      JOIN characters c ON c.campaign_id = cm.campaign_id
      WHERE c.id = character_inventory.character_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Character owners and admins can modify character inventory" ON character_inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM characters c
      JOIN campaign_members cm ON cm.campaign_id = c.campaign_id
      WHERE c.id = character_inventory.character_id 
      AND (c.owner_id = auth.uid() OR cm.role = 'admin' AND cm.user_id = auth.uid())
    )
  );

CREATE POLICY "Campaign members can view character weapons" ON character_weapons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members cm
      JOIN characters c ON c.campaign_id = cm.campaign_id
      WHERE c.id = character_weapons.character_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Character owners and admins can modify character weapons" ON character_weapons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM characters c
      JOIN campaign_members cm ON cm.campaign_id = c.campaign_id
      WHERE c.id = character_weapons.character_id 
      AND (c.owner_id = auth.uid() OR cm.role = 'admin' AND cm.user_id = auth.uid())
    )
  );

CREATE POLICY "Campaign members can view character armour" ON character_armour
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members cm
      JOIN characters c ON c.campaign_id = cm.campaign_id
      WHERE c.id = character_armour.character_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Character owners and admins can modify character armour" ON character_armour
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM characters c
      JOIN campaign_members cm ON cm.campaign_id = c.campaign_id
      WHERE c.id = character_armour.character_id 
      AND (c.owner_id = auth.uid() OR cm.role = 'admin' AND cm.user_id = auth.uid())
    )
  );

CREATE POLICY "Campaign members can view character ammo" ON character_ammo
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members cm
      JOIN characters c ON c.campaign_id = cm.campaign_id
      WHERE c.id = character_ammo.character_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Character owners and admins can modify character ammo" ON character_ammo
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM characters c
      JOIN campaign_members cm ON cm.campaign_id = c.campaign_id
      WHERE c.id = character_ammo.character_id 
      AND (c.owner_id = auth.uid() OR cm.role = 'admin' AND cm.user_id = auth.uid())
    )
  );