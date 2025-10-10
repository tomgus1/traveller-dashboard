export type FinanceRow = {
  Date: string;
  Description: string;
  Category: "Income" | "Expense" | "Transfer" | string;
  Subcategory?: string;
  ["Amount (Cr)"]: number;
  ["Paid By"]?: string;
  ["Paid From (Fund)"]?: string;
  Notes?: string;
};

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

export type AmmoRow = {
  Weapon: string;
  ["Ammo Type"]?: string;
  ["Magazine Size"]?: number | string;
  ["Rounds Loaded"]?: number | string;
  ["Spare Magazines"]?: number | string;
  ["Loose Rounds"]?: number | string;
  ["Total Rounds"]?: number | null;
  Notes?: string;
};

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

export type CharacterSheets = {
  Finance: FinanceRow[];
  Inventory: InventoryRow[];
  Weapons: WeaponRow[];
  Armour: ArmourRow[];
  Ammo?: AmmoRow[];
};

export type CampaignState = {
  Party_Finances: FinanceRow[];
  Ship_Accounts: FinanceRow[];
  Ship_Cargo: CargoRow[];
  Ship_Maintenance_Log: MaintenanceLogRow[];
  Loans_Mortgage: LoanRow[];
  Party_Inventory: InventoryRow[];
  Ammo_Tracker: AmmoRow[];
  PCs: Record<string, CharacterSheets>;
};
