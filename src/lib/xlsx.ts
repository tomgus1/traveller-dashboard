import * as XLSX from "xlsx";
import type { CampaignState, FinanceRow, CargoRow, InventoryRow, MaintenanceLogRow, LoanRow, AmmoRow } from "../types";
import { DEFAULT_STATE } from "../utils/storage";
import { PC_NAMES } from "../constants";

export function importXlsx(file: File, setState: (s: CampaignState) => void) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target?.result as ArrayBuffer);
    const wb = XLSX.read(data, { type: "array" });
    const next: CampaignState = structuredClone(DEFAULT_STATE);
    const toJson = (name: string): Record<string, unknown>[] =>
      wb.SheetNames.includes(name)
        ? XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" })
        : [];
    next.Party_Finances = toJson("Party_Finances") as FinanceRow[];
    next.Ship_Accounts = toJson("Ship_Accounts") as FinanceRow[];
    next.Ship_Cargo = toJson("Ship_Cargo") as CargoRow[];
    next.Ship_Maintenance_Log = toJson("Ship_Maintenance_Log") as MaintenanceLogRow[];
    next.Loans_Mortgage = toJson("Loans_Mortgage") as LoanRow[];
    next.Party_Inventory = toJson("Party_Inventory") as InventoryRow[];
    next.Ammo_Tracker = toJson("Ammo_Tracker") as AmmoRow[];
    for (const pc of PC_NAMES) {
      const rows = toJson(pc);
      const finance = rows.filter((r) =>
        Object.keys(r).includes("Amount (Cr)"),
      ) as FinanceRow[];
      const inventory = rows.filter((r) =>
        Object.keys(r).includes("Unit Value (Cr)"),
      ) as InventoryRow[];
      next.PCs[pc].Finance = finance;
      next.PCs[pc].Inventory = inventory;
    }
    setState(next);
  };
  reader.readAsArrayBuffer(file);
}

export function exportXlsx(state: CampaignState) {
  const wb = XLSX.utils.book_new();
  const add = (name: string, rows: Record<string, unknown>[]) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  };
  add("Party_Finances", state.Party_Finances);
  add("Ship_Accounts", state.Ship_Accounts);
  add("Ship_Cargo", state.Ship_Cargo);
  add("Ship_Maintenance_Log", state.Ship_Maintenance_Log);
  add("Loans_Mortgage", state.Loans_Mortgage);
  add("Party_Inventory", state.Party_Inventory);
  add("Ammo_Tracker", state.Ammo_Tracker);
  for (const pc of PC_NAMES) {
    const rows: Record<string, unknown>[] = [
      { ID: pc },
      { "Finance Ledger": "Finance Ledger" },
      ...state.PCs[pc].Finance,
      { Inventory: "Inventory" },
      ...state.PCs[pc].Inventory,
    ];
    add(pc, rows);
  }
  const filename = `Traveller_Campaign_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
