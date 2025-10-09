import * as XLSX from "xlsx";
import { CampaignState } from "../types";
import { DEFAULT_STATE } from "../utils/storage";
import { PC_NAMES } from "../constants";

export function importXlsx(file: File, setState: (s: CampaignState) => void) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target?.result as ArrayBuffer);
    const wb = XLSX.read(data, { type: "array" });
    const next: CampaignState = structuredClone(DEFAULT_STATE);
    const toJson = (name: string) =>
      wb.SheetNames.includes(name)
        ? XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" })
        : [];
    next.Party_Finances = toJson("Party_Finances") as any;
    next.Ship_Accounts = toJson("Ship_Accounts") as any;
    next.Ship_Cargo = toJson("Ship_Cargo") as any;
    next.Ship_Maintenance_Log = toJson("Ship_Maintenance_Log") as any;
    next.Loans_Mortgage = toJson("Loans_Mortgage") as any;
    next.Party_Inventory = toJson("Party_Inventory") as any;
    next.Ammo_Tracker = toJson("Ammo_Tracker") as any;
    for (const pc of PC_NAMES) {
      const rows = toJson(pc);
      const finance = (rows as any[]).filter((r) =>
        Object.keys(r).includes("Amount (Cr)"),
      );
      const inventory = (rows as any[]).filter((r) =>
        Object.keys(r).includes("Unit Value (Cr)"),
      );
      next.PCs[pc].Finance = finance;
      next.PCs[pc].Inventory = inventory;
    }
    setState(next);
  };
  reader.readAsArrayBuffer(file);
}

export function exportXlsx(state: CampaignState) {
  const wb = XLSX.utils.book_new();
  const add = (name: string, rows: any[]) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  };
  add("Party_Finances", state.Party_Finances as any);
  add("Ship_Accounts", state.Ship_Accounts as any);
  add("Ship_Cargo", state.Ship_Cargo as any);
  add("Ship_Maintenance_Log", state.Ship_Maintenance_Log);
  add("Loans_Mortgage", state.Loans_Mortgage);
  add("Party_Inventory", state.Party_Inventory);
  add("Ammo_Tracker", state.Ammo_Tracker);
  for (const pc of PC_NAMES) {
    const rows = [
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
