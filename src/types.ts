// Financial data types
export type FinanceRow = {
  Date: string;
  Description: string;
  Category: "Income" | "Expense" | "Transfer" | string;
  Subcategory?: string;
  ["Amount (Cr)"]: number;
  ["Paid By"]?: string;
  ["Paid From (Fund)"]?: string;
  ["Running Total"]?: number;
  Notes?: string;
};

// Ship and cargo types
export type CargoRow = {
  ["Leg/Route"]: string;
  Item: string;
  Tons: number;
  ["Purchase World"]: string;
  ["Purchase Price (Cr/ton)"]: number;
  ["Sale World"]?: string;
  ["Sale Price (Cr/ton)"]?: number | null;
  ["Broker (±DM)"]?: string;
  ["Fees/Taxes (Cr)"]?: number;
  ["Profit (Cr)"]?: number | null;
};

export type MaintenanceLogRow = {
  Date: string;
  Type: string;
  Description: string;
  ["Cost (Cr)"]?: number;
  Location?: string;
  Notes?: string;
};

export type LoanRow = {
  ["Loan Type"]: string;
  Principal: number;
  ["Interest Rate"]?: number;
  ["Monthly Payment"]?: number;
  ["Remaining Balance"]?: number;
  Notes?: string;
};

// Character inventory and equipment types
export type InventoryRow = {
  Item: string;
  Qty?: number;
  ["Unit Mass (kg)"]?: number;
  ["Total Mass (kg)"]?: number;
  ["Unit Value (Cr)"]?: number;
  ["Total Value (Cr)"]?: number;
  ["Location/Container"]?: string;
  Notes?: string;
};

export type AmmoRow = {
  Weapon: string;
  ["Ammo Type"]?: string;
  ["Magazine Size"]?: number | string;
  ["Rounds Loaded"]?: number | string;
  ["Spare Magazines"]?: number | string;
  ["Loose Rounds"]?: number | string;
  ["Total Rounds"]?: number | null;
  Cost?: number;
  Notes?: string;
};

export type WeaponRow = {
  Weapon: string;
  Type?: string;
  Damage?: string;
  Range?: string;
  Mass?: number | string;
  Cost?: number;
  Notes?: string;
};

export type ArmourRow = {
  Armour: string;
  Type?: string;
  Protection?: number | string;
  Mass?: number | string;
  Cost?: number;
  Notes?: string;
};

// Character data structure - follows Interface Segregation
export type CharacterSheets = {
  Finance: FinanceRow[];
  Inventory: InventoryRow[];
  Weapons: WeaponRow[];
  Armour: ArmourRow[];
  Ammo?: AmmoRow[];
};

// Financial state (for components that only need financial data)
export type FinancialState = {
  Party_Finances: FinanceRow[];
  Ship_Accounts: FinanceRow[];
};

// Ship state (for components that only need ship data)
export type ShipState = {
  Ship_Cargo: CargoRow[];
  Ship_Maintenance_Log: MaintenanceLogRow[];
};

// Character state (for components that only need character data)
export type CharacterState = {
  PCs: Record<string, CharacterSheets>;
};

// Full campaign state - composes smaller interfaces
export type CampaignState = FinancialState &
  ShipState &
  CharacterState & {
    Loans_Mortgage: LoanRow[];
    Party_Inventory: InventoryRow[];
    Ammo_Tracker: AmmoRow[];
  };
