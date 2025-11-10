import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  FinanceRow,
  CargoRow,
  MaintenanceLogRow,
  LoanRow,
  InventoryRow,
  AmmoRow,
} from '../../types';

export interface CampaignDataRepository {
  // Campaign Finances
  getCampaignFinances(campaignId: string): Promise<FinanceRow[]>;
  addCampaignFinance(campaignId: string, finance: Omit<FinanceRow, 'Running Total'>): Promise<FinanceRow>;
  updateCampaignFinance(id: string, finance: Partial<FinanceRow>): Promise<void>;
  deleteCampaignFinance(id: string): Promise<void>;

  // Ship Finances
  getShipFinances(campaignId: string): Promise<FinanceRow[]>;
  addShipFinance(campaignId: string, finance: Omit<FinanceRow, 'Running Total'>): Promise<FinanceRow>;
  updateShipFinance(id: string, finance: Partial<FinanceRow>): Promise<void>;
  deleteShipFinance(id: string): Promise<void>;

  // Ship Cargo
  getShipCargo(campaignId: string): Promise<CargoRow[]>;
  addShipCargo(campaignId: string, cargo: CargoRow): Promise<CargoRow>;
  updateShipCargo(id: string, cargo: Partial<CargoRow>): Promise<void>;
  deleteShipCargo(id: string): Promise<void>;

  // Ship Maintenance
  getShipMaintenance(campaignId: string): Promise<MaintenanceLogRow[]>;
  addShipMaintenance(campaignId: string, maintenance: MaintenanceLogRow): Promise<MaintenanceLogRow>;
  updateShipMaintenance(id: string, maintenance: Partial<MaintenanceLogRow>): Promise<void>;
  deleteShipMaintenance(id: string): Promise<void>;

  // Campaign Loans
  getCampaignLoans(campaignId: string): Promise<LoanRow[]>;
  addCampaignLoan(campaignId: string, loan: LoanRow): Promise<LoanRow>;
  updateCampaignLoan(id: string, loan: Partial<LoanRow>): Promise<void>;
  deleteCampaignLoan(id: string): Promise<void>;

  // Party Inventory
  getPartyInventory(campaignId: string): Promise<InventoryRow[]>;
  addPartyInventoryItem(campaignId: string, item: InventoryRow): Promise<InventoryRow>;
  updatePartyInventoryItem(id: string, item: Partial<InventoryRow>): Promise<void>;
  deletePartyInventoryItem(id: string): Promise<void>;

  // Campaign Ammo
  getCampaignAmmo(campaignId: string): Promise<AmmoRow[]>;
  addCampaignAmmo(campaignId: string, ammo: AmmoRow): Promise<AmmoRow>;
  updateCampaignAmmo(id: string, ammo: Partial<AmmoRow>): Promise<void>;
  deleteCampaignAmmo(id: string): Promise<void>;

  // Bulk operations
  getAllCampaignData(campaignId: string): Promise<{
    finances: FinanceRow[];
    shipFinances: FinanceRow[];
    cargo: CargoRow[];
    maintenance: MaintenanceLogRow[];
    loans: LoanRow[];
    partyInventory: InventoryRow[];
    ammo: AmmoRow[];
  }>;
}

export class SupabaseCampaignDataRepository implements CampaignDataRepository {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  // ===================================================================
  // CAMPAIGN FINANCES
  // ===================================================================

  async getCampaignFinances(campaignId: string): Promise<FinanceRow[]> {
    const { data, error } = await this.supabase
      .from('campaign_finances')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('transaction_date', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      Date: row.transaction_date,
      Description: row.description,
      Category: row.category,
      Subcategory: row.subcategory,
      'Amount (Cr)': parseFloat(row.amount),
      'Paid By': row.paid_by,
      'Paid From (Fund)': row.paid_from_fund,
      'Running Total': row.running_total ? parseFloat(row.running_total) : undefined,
      Notes: row.notes,
    }));
  }

  async addCampaignFinance(campaignId: string, finance: Omit<FinanceRow, 'Running Total'>): Promise<FinanceRow> {
    const { data, error } = await this.supabase
      .from('campaign_finances')
      .insert({
        campaign_id: campaignId,
        transaction_date: finance.Date,
        description: finance.Description,
        category: finance.Category,
        subcategory: finance.Subcategory,
        amount: finance['Amount (Cr)'],
        paid_by: finance['Paid By'],
        paid_from_fund: finance['Paid From (Fund)'],
        notes: finance.Notes,
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id, // Include database ID
      Date: data.transaction_date,
      Description: data.description,
      Category: data.category,
      Subcategory: data.subcategory,
      'Amount (Cr)': parseFloat(data.amount),
      'Paid By': data.paid_by,
      'Paid From (Fund)': data.paid_from_fund,
      'Running Total': data.running_total ? parseFloat(data.running_total) : undefined,
      Notes: data.notes,
    };
  }

  async updateCampaignFinance(id: string, finance: Partial<FinanceRow>): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (finance.Date) updates.transaction_date = finance.Date;
    if (finance.Description) updates.description = finance.Description;
    if (finance.Category) updates.category = finance.Category;
    if (finance.Subcategory !== undefined) updates.subcategory = finance.Subcategory;
    if (finance['Amount (Cr)'] !== undefined) updates.amount = finance['Amount (Cr)'];
    if (finance['Paid By'] !== undefined) updates.paid_by = finance['Paid By'];
    if (finance['Paid From (Fund)'] !== undefined) updates.paid_from_fund = finance['Paid From (Fund)'];
    if (finance.Notes !== undefined) updates.notes = finance.Notes;

    const { error } = await this.supabase
      .from('campaign_finances')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteCampaignFinance(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('campaign_finances')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ===================================================================
  // SHIP FINANCES (similar pattern to campaign finances)
  // ===================================================================

  async getShipFinances(campaignId: string): Promise<FinanceRow[]> {
    const { data, error } = await this.supabase
      .from('ship_finances')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('transaction_date', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id, // Include database ID for updates
      Date: row.transaction_date,
      Description: row.description,
      Category: row.category,
      Subcategory: row.subcategory,
      'Amount (Cr)': parseFloat(row.amount),
      'Paid By': row.paid_by,
      'Paid From (Fund)': row.paid_from_fund,
      'Running Total': row.running_total ? parseFloat(row.running_total) : undefined,
      Notes: row.notes,
    }));
  }

  async addShipFinance(campaignId: string, finance: Omit<FinanceRow, 'Running Total'>): Promise<FinanceRow> {
    const { data, error } = await this.supabase
      .from('ship_finances')
      .insert({
        campaign_id: campaignId,
        transaction_date: finance.Date,
        description: finance.Description,
        category: finance.Category,
        subcategory: finance.Subcategory,
        amount: finance['Amount (Cr)'],
        paid_by: finance['Paid By'],
        paid_from_fund: finance['Paid From (Fund)'],
        notes: finance.Notes,
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id, // Include database ID
      Date: data.transaction_date,
      Description: data.description,
      Category: data.category,
      Subcategory: data.subcategory,
      'Amount (Cr)': parseFloat(data.amount),
      'Paid By': data.paid_by,
      'Paid From (Fund)': data.paid_from_fund,
      'Running Total': data.running_total ? parseFloat(data.running_total) : undefined,
      Notes: data.notes,
    };
  }

  async updateShipFinance(id: string, finance: Partial<FinanceRow>): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (finance.Date) updates.transaction_date = finance.Date;
    if (finance.Description) updates.description = finance.Description;
    if (finance.Category) updates.category = finance.Category;
    if (finance.Subcategory !== undefined) updates.subcategory = finance.Subcategory;
    if (finance['Amount (Cr)'] !== undefined) updates.amount = finance['Amount (Cr)'];
    if (finance['Paid By'] !== undefined) updates.paid_by = finance['Paid By'];
    if (finance['Paid From (Fund)'] !== undefined) updates.paid_from_fund = finance['Paid From (Fund)'];
    if (finance.Notes !== undefined) updates.notes = finance.Notes;

    const { error } = await this.supabase
      .from('ship_finances')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteShipFinance(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('ship_finances')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ===================================================================
  // SHIP CARGO
  // ===================================================================

  async getShipCargo(campaignId: string): Promise<CargoRow[]> {
    const { data, error } = await this.supabase
      .from('ship_cargo')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      'Leg/Route': row.leg_route,
      Item: row.item,
      Tons: parseFloat(row.tons),
      'Purchase World': row.purchase_world,
      'Purchase Price (Cr/ton)': parseFloat(row.purchase_price_per_ton),
      'Sale World': row.sale_world,
      'Sale Price (Cr/ton)': row.sale_price_per_ton ? parseFloat(row.sale_price_per_ton) : null,
      'Broker (±DM)': row.broker_dm,
      'Fees/Taxes (Cr)': row.fees_taxes ? parseFloat(row.fees_taxes) : undefined,
      'Profit (Cr)': row.profit ? parseFloat(row.profit) : null,
    }));
  }

  async addShipCargo(campaignId: string, cargo: CargoRow): Promise<CargoRow> {
    const { data, error } = await this.supabase
      .from('ship_cargo')
      .insert({
        campaign_id: campaignId,
        leg_route: cargo['Leg/Route'],
        item: cargo.Item,
        tons: cargo.Tons,
        purchase_world: cargo['Purchase World'],
        purchase_price_per_ton: cargo['Purchase Price (Cr/ton)'],
        sale_world: cargo['Sale World'],
        sale_price_per_ton: cargo['Sale Price (Cr/ton)'],
        broker_dm: cargo['Broker (±DM)'],
        fees_taxes: cargo['Fees/Taxes (Cr)'],
        profit: cargo['Profit (Cr)'],
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      'Leg/Route': data.leg_route,
      Item: data.item,
      Tons: parseFloat(data.tons),
      'Purchase World': data.purchase_world,
      'Purchase Price (Cr/ton)': parseFloat(data.purchase_price_per_ton),
      'Sale World': data.sale_world,
      'Sale Price (Cr/ton)': data.sale_price_per_ton ? parseFloat(data.sale_price_per_ton) : null,
      'Broker (±DM)': data.broker_dm,
      'Fees/Taxes (Cr)': data.fees_taxes ? parseFloat(data.fees_taxes) : undefined,
      'Profit (Cr)': data.profit ? parseFloat(data.profit) : null,
    };
  }

  async updateShipCargo(id: string, cargo: Partial<CargoRow>): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (cargo['Leg/Route']) updates.leg_route = cargo['Leg/Route'];
    if (cargo.Item) updates.item = cargo.Item;
    if (cargo.Tons !== undefined) updates.tons = cargo.Tons;
    if (cargo['Purchase World']) updates.purchase_world = cargo['Purchase World'];
    if (cargo['Purchase Price (Cr/ton)'] !== undefined) updates.purchase_price_per_ton = cargo['Purchase Price (Cr/ton)'];
    if (cargo['Sale World'] !== undefined) updates.sale_world = cargo['Sale World'];
    if (cargo['Sale Price (Cr/ton)'] !== undefined) updates.sale_price_per_ton = cargo['Sale Price (Cr/ton)'];
    if (cargo['Broker (±DM)'] !== undefined) updates.broker_dm = cargo['Broker (±DM)'];
    if (cargo['Fees/Taxes (Cr)'] !== undefined) updates.fees_taxes = cargo['Fees/Taxes (Cr)'];
    if (cargo['Profit (Cr)'] !== undefined) updates.profit = cargo['Profit (Cr)'];

    const { error } = await this.supabase
      .from('ship_cargo')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteShipCargo(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('ship_cargo')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ===================================================================
  // SHIP MAINTENANCE
  // ===================================================================

  async getShipMaintenance(campaignId: string): Promise<MaintenanceLogRow[]> {
    const { data, error } = await this.supabase
      .from('ship_maintenance')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('maintenance_date', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      Date: row.maintenance_date,
      Type: row.type,
      Description: row.description,
      'Cost (Cr)': row.cost ? parseFloat(row.cost) : undefined,
      Location: row.location,
      Notes: row.notes,
    }));
  }

  async addShipMaintenance(campaignId: string, maintenance: MaintenanceLogRow): Promise<MaintenanceLogRow> {
    const { data, error } = await this.supabase
      .from('ship_maintenance')
      .insert({
        campaign_id: campaignId,
        maintenance_date: maintenance.Date,
        type: maintenance.Type,
        description: maintenance.Description,
        cost: maintenance['Cost (Cr)'],
        location: maintenance.Location,
        notes: maintenance.Notes,
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      Date: data.maintenance_date,
      Type: data.type,
      Description: data.description,
      'Cost (Cr)': data.cost ? parseFloat(data.cost) : undefined,
      Location: data.location,
      Notes: data.notes,
    };
  }

  async updateShipMaintenance(id: string, maintenance: Partial<MaintenanceLogRow>): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (maintenance.Date) updates.maintenance_date = maintenance.Date;
    if (maintenance.Type) updates.type = maintenance.Type;
    if (maintenance.Description) updates.description = maintenance.Description;
    if (maintenance['Cost (Cr)'] !== undefined) updates.cost = maintenance['Cost (Cr)'];
    if (maintenance.Location !== undefined) updates.location = maintenance.Location;
    if (maintenance.Notes !== undefined) updates.notes = maintenance.Notes;

    const { error } = await this.supabase
      .from('ship_maintenance')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteShipMaintenance(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('ship_maintenance')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ===================================================================
  // CAMPAIGN LOANS
  // ===================================================================

  async getCampaignLoans(campaignId: string): Promise<LoanRow[]> {
    const { data, error } = await this.supabase
      .from('campaign_loans')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      'Loan Type': row.loan_type,
      Principal: parseFloat(row.principal),
      'Interest Rate': row.interest_rate ? parseFloat(row.interest_rate) : undefined,
      'Monthly Payment': row.monthly_payment ? parseFloat(row.monthly_payment) : undefined,
      'Remaining Balance': row.remaining_balance ? parseFloat(row.remaining_balance) : undefined,
      Notes: row.notes,
    }));
  }

  async addCampaignLoan(campaignId: string, loan: LoanRow): Promise<LoanRow> {
    const { data, error } = await this.supabase
      .from('campaign_loans')
      .insert({
        campaign_id: campaignId,
        loan_type: loan['Loan Type'],
        principal: loan.Principal,
        interest_rate: loan['Interest Rate'],
        monthly_payment: loan['Monthly Payment'],
        remaining_balance: loan['Remaining Balance'],
        notes: loan.Notes,
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      'Loan Type': data.loan_type,
      Principal: parseFloat(data.principal),
      'Interest Rate': data.interest_rate ? parseFloat(data.interest_rate) : undefined,
      'Monthly Payment': data.monthly_payment ? parseFloat(data.monthly_payment) : undefined,
      'Remaining Balance': data.remaining_balance ? parseFloat(data.remaining_balance) : undefined,
      Notes: data.notes,
    };
  }

  async updateCampaignLoan(id: string, loan: Partial<LoanRow>): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (loan['Loan Type']) updates.loan_type = loan['Loan Type'];
    if (loan.Principal !== undefined) updates.principal = loan.Principal;
    if (loan['Interest Rate'] !== undefined) updates.interest_rate = loan['Interest Rate'];
    if (loan['Monthly Payment'] !== undefined) updates.monthly_payment = loan['Monthly Payment'];
    if (loan['Remaining Balance'] !== undefined) updates.remaining_balance = loan['Remaining Balance'];
    if (loan.Notes !== undefined) updates.notes = loan.Notes;

    const { error } = await this.supabase
      .from('campaign_loans')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteCampaignLoan(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('campaign_loans')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ===================================================================
  // PARTY INVENTORY
  // ===================================================================

  async getPartyInventory(campaignId: string): Promise<InventoryRow[]> {
    const { data, error } = await this.supabase
      .from('party_inventory')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      Item: row.item,
      Qty: row.quantity,
      'Unit Mass (kg)': row.unit_mass_kg ? parseFloat(row.unit_mass_kg) : undefined,
      'Total Mass (kg)': row.total_mass_kg ? parseFloat(row.total_mass_kg) : undefined,
      'Unit Value (Cr)': row.unit_value ? parseFloat(row.unit_value) : undefined,
      'Total Value (Cr)': row.total_value ? parseFloat(row.total_value) : undefined,
      'Location/Container': row.location_container,
      Notes: row.notes,
    }));
  }

  async addPartyInventoryItem(campaignId: string, item: InventoryRow): Promise<InventoryRow> {
    const { data, error } = await this.supabase
      .from('party_inventory')
      .insert({
        campaign_id: campaignId,
        item: item.Item,
        quantity: item.Qty,
        unit_mass_kg: item['Unit Mass (kg)'],
        total_mass_kg: item['Total Mass (kg)'],
        unit_value: item['Unit Value (Cr)'],
        total_value: item['Total Value (Cr)'],
        location_container: item['Location/Container'],
        notes: item.Notes,
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      Item: data.item,
      Qty: data.quantity,
      'Unit Mass (kg)': data.unit_mass_kg ? parseFloat(data.unit_mass_kg) : undefined,
      'Total Mass (kg)': data.total_mass_kg ? parseFloat(data.total_mass_kg) : undefined,
      'Unit Value (Cr)': data.unit_value ? parseFloat(data.unit_value) : undefined,
      'Total Value (Cr)': data.total_value ? parseFloat(data.total_value) : undefined,
      'Location/Container': data.location_container,
      Notes: data.notes,
    };
  }

  async updatePartyInventoryItem(id: string, item: Partial<InventoryRow>): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (item.Item) updates.item = item.Item;
    if (item.Qty !== undefined) updates.quantity = item.Qty;
    if (item['Unit Mass (kg)'] !== undefined) updates.unit_mass_kg = item['Unit Mass (kg)'];
    if (item['Total Mass (kg)'] !== undefined) updates.total_mass_kg = item['Total Mass (kg)'];
    if (item['Unit Value (Cr)'] !== undefined) updates.unit_value = item['Unit Value (Cr)'];
    if (item['Total Value (Cr)'] !== undefined) updates.total_value = item['Total Value (Cr)'];
    if (item['Location/Container'] !== undefined) updates.location_container = item['Location/Container'];
    if (item.Notes !== undefined) updates.notes = item.Notes;

    const { error } = await this.supabase
      .from('party_inventory')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  async deletePartyInventoryItem(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('party_inventory')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ===================================================================
  // CAMPAIGN AMMO
  // ===================================================================

  async getCampaignAmmo(campaignId: string): Promise<AmmoRow[]> {
    const { data, error } = await this.supabase
      .from('campaign_ammo')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      Weapon: row.weapon,
      'Ammo Type': row.ammo_type,
      'Magazine Size': row.magazine_size,
      'Rounds Loaded': row.rounds_loaded,
      'Spare Magazines': row.spare_magazines,
      'Loose Rounds': row.loose_rounds,
      'Total Rounds': row.total_rounds,
      Cost: row.cost ? parseFloat(row.cost) : undefined,
      Notes: row.notes,
    }));
  }

  async addCampaignAmmo(campaignId: string, ammo: AmmoRow): Promise<AmmoRow> {
    const { data, error } = await this.supabase
      .from('campaign_ammo')
      .insert({
        campaign_id: campaignId,
        weapon: ammo.Weapon,
        ammo_type: ammo['Ammo Type'],
        magazine_size: ammo['Magazine Size']?.toString(),
        rounds_loaded: ammo['Rounds Loaded']?.toString(),
        spare_magazines: ammo['Spare Magazines']?.toString(),
        loose_rounds: ammo['Loose Rounds']?.toString(),
        total_rounds: ammo['Total Rounds'],
        cost: ammo.Cost,
        notes: ammo.Notes,
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      Weapon: data.weapon,
      'Ammo Type': data.ammo_type,
      'Magazine Size': data.magazine_size,
      'Rounds Loaded': data.rounds_loaded,
      'Spare Magazines': data.spare_magazines,
      'Loose Rounds': data.loose_rounds,
      'Total Rounds': data.total_rounds,
      Cost: data.cost ? parseFloat(data.cost) : undefined,
      Notes: data.notes,
    };
  }

  async updateCampaignAmmo(id: string, ammo: Partial<AmmoRow>): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (ammo.Weapon) updates.weapon = ammo.Weapon;
    if (ammo['Ammo Type'] !== undefined) updates.ammo_type = ammo['Ammo Type'];
    if (ammo['Magazine Size'] !== undefined) updates.magazine_size = ammo['Magazine Size']?.toString();
    if (ammo['Rounds Loaded'] !== undefined) updates.rounds_loaded = ammo['Rounds Loaded']?.toString();
    if (ammo['Spare Magazines'] !== undefined) updates.spare_magazines = ammo['Spare Magazines']?.toString();
    if (ammo['Loose Rounds'] !== undefined) updates.loose_rounds = ammo['Loose Rounds']?.toString();
    if (ammo['Total Rounds'] !== undefined) updates.total_rounds = ammo['Total Rounds'];
    if (ammo.Cost !== undefined) updates.cost = ammo.Cost;
    if (ammo.Notes !== undefined) updates.notes = ammo.Notes;

    const { error } = await this.supabase
      .from('campaign_ammo')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteCampaignAmmo(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('campaign_ammo')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ===================================================================
  // BULK OPERATIONS
  // ===================================================================

  async getAllCampaignData(campaignId: string): Promise<{
    finances: FinanceRow[];
    shipFinances: FinanceRow[];
    cargo: CargoRow[];
    maintenance: MaintenanceLogRow[];
    loans: LoanRow[];
    partyInventory: InventoryRow[];
    ammo: AmmoRow[];
  }> {
    const [finances, shipFinances, cargo, maintenance, loans, partyInventory, ammo] = 
      await Promise.all([
        this.getCampaignFinances(campaignId),
        this.getShipFinances(campaignId),
        this.getShipCargo(campaignId),
        this.getShipMaintenance(campaignId),
        this.getCampaignLoans(campaignId),
        this.getPartyInventory(campaignId),
        this.getCampaignAmmo(campaignId),
      ]);

    return {
      finances,
      shipFinances,
      cargo,
      maintenance,
      loans,
      partyInventory,
      ammo,
    };
  }
}
