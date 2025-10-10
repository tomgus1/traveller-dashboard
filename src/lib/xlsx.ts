import * as XLSX from "xlsx";
import type {
  CampaignState,
  FinanceRow,
  CargoRow,
  InventoryRow,
  MaintenanceLogRow,
  LoanRow,
  AmmoRow,
} from "../types";
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
    next.Ship_Maintenance_Log = toJson(
      "Ship_Maintenance_Log"
    ) as MaintenanceLogRow[];
    next.Loans_Mortgage = toJson("Loans_Mortgage") as LoanRow[];
    next.Party_Inventory = toJson("Party_Inventory") as InventoryRow[];
    next.Ammo_Tracker = toJson("Ammo_Tracker") as AmmoRow[];
    for (const pc of PC_NAMES) {
      const rows = toJson(pc);
      const finance = rows.filter((r) =>
        Object.keys(r).includes("Amount (Cr)")
      ) as FinanceRow[];
      const inventory = rows.filter((r) =>
        Object.keys(r).includes("Unit Value (Cr)")
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

  // Helper function to clean data for universal compatibility
  const cleanDataForExport = (
    data: Record<string, unknown>[]
  ): Record<string, unknown>[] => {
    return data.map((row) => {
      const cleanRow: Record<string, unknown> = {};
      Object.entries(row).forEach(([key, value]) => {
        // Convert null/undefined to empty string for better compatibility
        if (value === null || value === undefined) {
          cleanRow[key] = "";
        }
        // Ensure numbers are properly typed
        else if (typeof value === "number" && !isNaN(value)) {
          cleanRow[key] = value;
        }
        // Convert everything else to string
        else {
          cleanRow[key] = String(value);
        }
      });
      return cleanRow;
    });
  };

  const add = (name: string, rows: Record<string, unknown>[]) => {
    if (rows.length === 0) return; // Skip empty sheets

    const cleanedRows = cleanDataForExport(rows);
    const ws = XLSX.utils.json_to_sheet(cleanedRows, {
      // Ensure consistent column ordering
      header: Object.keys(cleanedRows[0] || {}),
    });

    // Set column widths for better readability
    const colWidths = Object.keys(cleanedRows[0] || {}).map((key) => ({
      wch: Math.max(key.length, 15), // Minimum width of 15 characters
    }));
    ws["!cols"] = colWidths;

    // Ensure worksheet name is universally compatible (max 31 chars, no special chars)
    const safeName = name
      .slice(0, 31)
      .replace(/[\\/?*[\]]/g, "_") // Replace invalid characters
      .trim();

    XLSX.utils.book_append_sheet(wb, ws, safeName);
  };

  // Export main sheets with cleaned data
  add("Party_Finances", state.Party_Finances);
  add("Ship_Accounts", state.Ship_Accounts);
  add("Ship_Cargo", state.Ship_Cargo);
  add("Ship_Maintenance_Log", state.Ship_Maintenance_Log);
  add("Loans_Mortgage", state.Loans_Mortgage);
  add("Party_Inventory", state.Party_Inventory);
  add("Ammo_Tracker", state.Ammo_Tracker);

  // Export PC sheets with better structure
  for (const pc of PC_NAMES) {
    const pcData = state.PCs[pc];

    // Create separate sheets for each PC's finance and inventory if they have data
    if (pcData.Finance && pcData.Finance.length > 0) {
      add(`${pc}_Finance`, pcData.Finance);
    }

    if (pcData.Inventory && pcData.Inventory.length > 0) {
      add(`${pc}_Inventory`, pcData.Inventory);
    }

    if (pcData.Weapons && pcData.Weapons.length > 0) {
      add(`${pc}_Weapons`, pcData.Weapons);
    }

    if (pcData.Armour && pcData.Armour.length > 0) {
      add(`${pc}_Armour`, pcData.Armour);
    }

    if (pcData.Ammo && pcData.Ammo.length > 0) {
      add(`${pc}_Ammo`, pcData.Ammo);
    }
  }

  const filename = `Traveller_Campaign_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;

  // Use writeFile with universal compatibility options
  XLSX.writeFile(wb, filename, {
    bookType: "xlsx",
    compression: false, // Better compatibility with LibreOffice
  });
}
