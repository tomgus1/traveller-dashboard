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
