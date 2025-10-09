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

export type CharacterSheets = {
  Finance: FinanceRow[];
  Inventory: any[];
  Weapons: any[];
  Armor: any[];
  Ammo?: AmmoRow[];
};

export type CampaignState = {
  Party_Finances: FinanceRow[];
  Ship_Accounts: FinanceRow[];
  Ship_Cargo: CargoRow[];
  Ship_Maintenance_Log: any[];
  Loans_Mortgage: any[];
  Party_Inventory: any[];
  Ammo_Tracker: any[];
  PCs: Record<string, CharacterSheets>;
};
