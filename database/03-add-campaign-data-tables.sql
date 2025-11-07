-- TRAVELLER DASHBOARD - DATABASE MIGRATION
-- Adds campaign-level data tables for persistent storage
-- 
-- This migration adds tables for:
-- - Party Finances (shared campaign finances)
-- - Ship Accounts (ship-specific finances)
-- - Ship Cargo
-- - Ship Maintenance Log
-- - Loans/Mortgages
-- - Party Inventory
-- - Campaign Ammo Tracker

-- =====================================================================
-- CAMPAIGN FINANCES TABLES
-- =====================================================================

-- Party Finances (shared campaign-level finances)
CREATE TABLE IF NOT EXISTS campaign_finances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Income', 'Expense', 'Transfer')),
  subcategory TEXT,
  amount DECIMAL(12,2) NOT NULL,
  paid_by TEXT,
  paid_from_fund TEXT,
  running_total DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_finances_campaign ON campaign_finances(campaign_id);
CREATE INDEX idx_campaign_finances_date ON campaign_finances(campaign_id, transaction_date DESC);

-- Ship Accounts (ship-specific finances)
CREATE TABLE IF NOT EXISTS ship_finances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Income', 'Expense', 'Transfer')),
  subcategory TEXT,
  amount DECIMAL(12,2) NOT NULL,
  paid_by TEXT,
  paid_from_fund TEXT,
  running_total DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ship_finances_campaign ON ship_finances(campaign_id);
CREATE INDEX idx_ship_finances_date ON ship_finances(campaign_id, transaction_date DESC);

-- =====================================================================
-- SHIP OPERATIONS TABLES
-- =====================================================================

-- Ship Cargo
CREATE TABLE IF NOT EXISTS ship_cargo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  leg_route TEXT NOT NULL,
  item TEXT NOT NULL,
  tons DECIMAL(10,2) NOT NULL,
  purchase_world TEXT NOT NULL,
  purchase_price_per_ton DECIMAL(10,2) NOT NULL,
  sale_world TEXT,
  sale_price_per_ton DECIMAL(10,2),
  broker_dm TEXT,
  fees_taxes DECIMAL(10,2),
  profit DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ship_cargo_campaign ON ship_cargo(campaign_id);
CREATE INDEX idx_ship_cargo_route ON ship_cargo(campaign_id, leg_route);

-- Ship Maintenance Log
CREATE TABLE IF NOT EXISTS ship_maintenance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  maintenance_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  cost DECIMAL(10,2),
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ship_maintenance_campaign ON ship_maintenance(campaign_id);
CREATE INDEX idx_ship_maintenance_date ON ship_maintenance(campaign_id, maintenance_date DESC);

-- =====================================================================
-- CAMPAIGN ASSETS & DEBTS TABLES
-- =====================================================================

-- Loans and Mortgages
CREATE TABLE IF NOT EXISTS campaign_loans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  loan_type TEXT NOT NULL,
  principal DECIMAL(12,2) NOT NULL,
  interest_rate DECIMAL(5,2),
  monthly_payment DECIMAL(10,2),
  remaining_balance DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_loans_campaign ON campaign_loans(campaign_id);

-- Party Inventory (shared items)
CREATE TABLE IF NOT EXISTS party_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  item TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_mass_kg DECIMAL(8,2),
  total_mass_kg DECIMAL(8,2),
  unit_value DECIMAL(10,2),
  total_value DECIMAL(10,2),
  location_container TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_party_inventory_campaign ON party_inventory(campaign_id);

-- Campaign Ammo Tracker (shared ammo supplies)
CREATE TABLE IF NOT EXISTS campaign_ammo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  weapon TEXT NOT NULL,
  ammo_type TEXT,
  magazine_size TEXT,
  rounds_loaded TEXT,
  spare_magazines TEXT,
  loose_rounds TEXT,
  total_rounds INTEGER,
  cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_ammo_campaign ON campaign_ammo(campaign_id);

-- =====================================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE campaign_finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ship_finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ship_cargo ENABLE ROW LEVEL SECURITY;
ALTER TABLE ship_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_ammo ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- RLS POLICIES (all tables follow same pattern)
-- =====================================================================

-- Campaign Finances Policies
CREATE POLICY "Users can view campaign finances if they are members"
  ON campaign_finances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.campaign_id = campaign_finances.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert campaign finances if they are members"
  ON campaign_finances FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.campaign_id = campaign_finances.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update campaign finances if they are members"
  ON campaign_finances FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.campaign_id = campaign_finances.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete campaign finances if they are admins or GMs"
  ON campaign_finances FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.campaign_id = campaign_finances.campaign_id
      AND campaign_members.user_id = auth.uid()
      AND (campaign_members.is_admin = TRUE OR campaign_members.is_gm = TRUE)
    )
  );

-- Ship Finances Policies (same pattern)
CREATE POLICY "Users can view ship finances if they are members"
  ON ship_finances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.campaign_id = ship_finances.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert ship finances if they are members"
  ON ship_finances FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.campaign_id = ship_finances.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update ship finances if they are members"
  ON ship_finances FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.campaign_id = ship_finances.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete ship finances if they are admins or GMs"
  ON ship_finances FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.campaign_id = ship_finances.campaign_id
      AND campaign_members.user_id = auth.uid()
      AND (campaign_members.is_admin = TRUE OR campaign_members.is_gm = TRUE)
    )
  );

-- Ship Cargo Policies
CREATE POLICY "Users can view ship cargo if they are members"
  ON ship_cargo FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.campaign_id = ship_cargo.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage ship cargo if they are members"
  ON ship_cargo FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.campaign_id = ship_cargo.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

-- Ship Maintenance Policies
CREATE POLICY "Users can view ship maintenance if they are members"
  ON ship_maintenance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.campaign_id = ship_maintenance.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage ship maintenance if they are members"
  ON ship_maintenance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.campaign_id = ship_maintenance.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

-- Campaign Loans Policies
CREATE POLICY "Users can view campaign loans if they are members"
  ON campaign_loans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.campaign_id = campaign_loans.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage campaign loans if they are members"
  ON campaign_loans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.campaign_id = campaign_loans.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

-- Party Inventory Policies
CREATE POLICY "Users can view party inventory if they are members"
  ON party_inventory FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.campaign_id = party_inventory.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage party inventory if they are members"
  ON party_inventory FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.campaign_id = party_inventory.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

-- Campaign Ammo Policies
CREATE POLICY "Users can view campaign ammo if they are members"
  ON campaign_ammo FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.campaign_id = campaign_ammo.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage campaign ammo if they are members"
  ON campaign_ammo FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.campaign_id = campaign_ammo.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

-- =====================================================================
-- HELPER FUNCTIONS
-- =====================================================================

-- Function to get all campaign data for a specific campaign
CREATE OR REPLACE FUNCTION get_campaign_data(p_campaign_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'finances', (SELECT json_agg(row_to_json(campaign_finances.*)) FROM campaign_finances WHERE campaign_id = p_campaign_id),
    'ship_finances', (SELECT json_agg(row_to_json(ship_finances.*)) FROM ship_finances WHERE campaign_id = p_campaign_id),
    'cargo', (SELECT json_agg(row_to_json(ship_cargo.*)) FROM ship_cargo WHERE campaign_id = p_campaign_id),
    'maintenance', (SELECT json_agg(row_to_json(ship_maintenance.*)) FROM ship_maintenance WHERE campaign_id = p_campaign_id),
    'loans', (SELECT json_agg(row_to_json(campaign_loans.*)) FROM campaign_loans WHERE campaign_id = p_campaign_id),
    'party_inventory', (SELECT json_agg(row_to_json(party_inventory.*)) FROM party_inventory WHERE campaign_id = p_campaign_id),
    'ammo', (SELECT json_agg(row_to_json(campaign_ammo.*)) FROM campaign_ammo WHERE campaign_id = p_campaign_id)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================

SELECT 'Migration Complete: Campaign data tables created with RLS policies.' as status;
SELECT 'All campaign-level data can now be stored in the database.' as info;
