-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Users table (handled by Supabase Auth)
-- Additional user profile information
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns table
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign membership with roles
CREATE TABLE campaign_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'gm', 'player')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, user_id)
);

-- Characters table
CREATE TABLE characters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, name)
);

-- Party/Shared financial data
CREATE TABLE party_finances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  amount_cr DECIMAL NOT NULL,
  paid_by TEXT,
  paid_from_fund TEXT,
  running_total DECIMAL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ship accounts
CREATE TABLE ship_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  amount_cr DECIMAL NOT NULL,
  paid_by TEXT,
  paid_from_fund TEXT,
  running_total DECIMAL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ship cargo
CREATE TABLE ship_cargo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  leg_route TEXT NOT NULL,
  item TEXT NOT NULL,
  tons DECIMAL NOT NULL,
  purchase_world TEXT NOT NULL,
  purchase_price_per_ton DECIMAL NOT NULL,
  sale_world TEXT,
  sale_price_per_ton DECIMAL,
  broker_dm TEXT,
  fees_taxes_cr DECIMAL,
  profit_cr DECIMAL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ship maintenance log
CREATE TABLE ship_maintenance_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  cost_cr DECIMAL,
  location TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loans and mortgages
CREATE TABLE loans_mortgage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  loan_type TEXT NOT NULL,
  principal DECIMAL NOT NULL,
  interest_rate DECIMAL,
  monthly_payment DECIMAL,
  remaining_balance DECIMAL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Party inventory
CREATE TABLE party_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  qty INTEGER,
  unit_mass_kg DECIMAL,
  total_mass_kg DECIMAL,
  unit_value_cr DECIMAL,
  total_value_cr DECIMAL,
  location_container TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Character-specific tables
CREATE TABLE character_finances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  amount_cr DECIMAL NOT NULL,
  paid_by TEXT,
  paid_from_fund TEXT,
  running_total DECIMAL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE character_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  qty INTEGER,
  unit_mass_kg DECIMAL,
  total_mass_kg DECIMAL,
  unit_value_cr DECIMAL,
  total_value_cr DECIMAL,
  location_container TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE character_weapons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  weapon TEXT NOT NULL,
  type TEXT,
  damage TEXT,
  range TEXT,
  mass DECIMAL,
  cost DECIMAL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE character_armour (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  armour TEXT NOT NULL,
  type TEXT,
  protection TEXT,
  mass DECIMAL,
  cost DECIMAL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE character_ammo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  weapon TEXT NOT NULL,
  ammo_type TEXT,
  magazine_size INTEGER,
  rounds_loaded INTEGER,
  spare_magazines INTEGER,
  loose_rounds INTEGER,
  total_rounds INTEGER,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Central ammo tracker (shared)
CREATE TABLE ammo_tracker (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  weapon TEXT NOT NULL,
  ammo_type TEXT,
  magazine_size INTEGER,
  rounds_loaded INTEGER,
  spare_magazines INTEGER,
  loose_rounds INTEGER,
  total_rounds INTEGER,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ship_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ship_cargo ENABLE ROW LEVEL SECURITY;
ALTER TABLE ship_maintenance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans_mortgage ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_weapons ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_armour ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_ammo ENABLE ROW LEVEL SECURITY;
ALTER TABLE ammo_tracker ENABLE ROW LEVEL SECURITY;