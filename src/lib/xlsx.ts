import * as ExcelJS from "exceljs";
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

export async function importXlsx(
  file: File,
  setState: (s: CampaignState) => void
) {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const next: CampaignState = structuredClone(DEFAULT_STATE);

  const getSheetData = (sheetName: string): Record<string, unknown>[] => {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) return [];

    const data: Record<string, unknown>[] = [];
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];

    // Get headers
    headerRow.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
      headers[colNumber - 1] = String(cell.value || "");
    });

    // Get data rows
    worksheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
      if (rowNumber === 1) return; // Skip header row

      const rowData: Record<string, unknown> = {};
      row.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
        const header = headers[colNumber - 1];
        if (header) {
          rowData[header] = cell.value || "";
        }
      });

      // Only add row if it has some data
      if (Object.values(rowData).some((val) => val !== "")) {
        data.push(rowData);
      }
    });

    return data;
  };

  next.Party_Finances = getSheetData("Party_Finances") as FinanceRow[];
  next.Ship_Accounts = getSheetData("Ship_Accounts") as FinanceRow[];
  next.Ship_Cargo = getSheetData("Ship_Cargo") as CargoRow[];
  next.Ship_Maintenance_Log = getSheetData(
    "Ship_Maintenance_Log"
  ) as MaintenanceLogRow[];
  next.Loans_Mortgage = getSheetData("Loans_Mortgage") as LoanRow[];
  next.Party_Inventory = getSheetData("Party_Inventory") as InventoryRow[];
  next.Ammo_Tracker = getSheetData("Ammo_Tracker") as AmmoRow[];

  for (const pc of PC_NAMES) {
    const financeRows = getSheetData(`${pc}_Finance`) as FinanceRow[];
    const inventoryRows = getSheetData(`${pc}_Inventory`) as InventoryRow[];

    next.PCs[pc].Finance = financeRows;
    next.PCs[pc].Inventory = inventoryRows;
  }

  setState(next);
}

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

const addWorksheet = (
  workbook: ExcelJS.Workbook,
  name: string,
  rows: Record<string, unknown>[],
  defaultHeaders?: string[]
) => {
  const cleanedRows = cleanDataForExport(rows);

  // Use default headers if no data
  const headers =
    cleanedRows.length > 0 ? Object.keys(cleanedRows[0]) : defaultHeaders || [];

  if (headers.length === 0) return;

  // Ensure worksheet name is universally compatible (max 31 chars, no special chars)
  const safeName = name
    .slice(0, 31)
    .replace(/[\\/?*[\]]/g, "_")
    .trim();

  const worksheet = workbook.addWorksheet(safeName);

  // Add headers
  worksheet.addRow(headers);

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  // Add data rows
  cleanedRows.forEach((row) => {
    const values = headers.map((header) => row[header] || "");
    worksheet.addRow(values);
  });

  // Auto-fit columns
  worksheet.columns.forEach((column: Partial<ExcelJS.Column>) => {
    if (column.header) {
      column.width = Math.max(String(column.header).length, 15);
    }
  });
};

const addMainSheets = (workbook: ExcelJS.Workbook, state: CampaignState) => {
  addWorksheet(workbook, "Party_Finances", state.Party_Finances, [
    "Date",
    "Description",
    "Amount (Cr)",
    "Running Total",
  ]);
  addWorksheet(workbook, "Ship_Accounts", state.Ship_Accounts, [
    "Date",
    "Description",
    "Amount (Cr)",
    "Running Total",
  ]);
  addWorksheet(workbook, "Ship_Cargo", state.Ship_Cargo, [
    "Item",
    "Quantity",
    "Unit Value (Cr)",
    "Total Value (Cr)",
  ]);
  addWorksheet(workbook, "Ship_Maintenance_Log", state.Ship_Maintenance_Log, [
    "Date",
    "Item",
    "Hours",
  ]);
  addWorksheet(workbook, "Loans_Mortgage", state.Loans_Mortgage, [
    "Loan",
    "Principal",
    "Interest Rate",
    "Monthly Payment",
    "Balance",
  ]);
  addWorksheet(workbook, "Party_Inventory", state.Party_Inventory, [
    "Item",
    "Quantity",
    "Unit Value (Cr)",
    "Total Value (Cr)",
  ]);
  addWorksheet(workbook, "Ammo_Tracker", state.Ammo_Tracker, [
    "Character",
    "Weapon",
    "Type",
    "Count",
  ]);
};

const addPCSheets = (workbook: ExcelJS.Workbook, state: CampaignState) => {
  for (const pc of PC_NAMES) {
    const pcData = state.PCs[pc];

    addWorksheet(workbook, `${pc}_Finance`, pcData.Finance || [], [
      "Date",
      "Description",
      "Amount (Cr)",
      "Running Total",
    ]);
    addWorksheet(workbook, `${pc}_Inventory`, pcData.Inventory || [], [
      "Item",
      "Quantity",
      "Unit Value (Cr)",
      "Total Value (Cr)",
    ]);
    addWorksheet(workbook, `${pc}_Weapons`, pcData.Weapons || [], [
      "Weapon",
      "Damage",
      "Range",
      "Mass",
      "Cost",
    ]);
    addWorksheet(workbook, `${pc}_Armour`, pcData.Armour || [], [
      "Armour",
      "Protection",
      "Mass",
      "Cost",
    ]);
    addWorksheet(workbook, `${pc}_Ammo`, pcData.Ammo || [], [
      "Weapon",
      "Type",
      "Count",
    ]);
  }
};

export async function exportXlsx(state: CampaignState) {
  const workbook = new ExcelJS.Workbook();

  addMainSheets(workbook, state);
  addPCSheets(workbook, state);

  const filename = `Traveller_Campaign_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;

  // Generate the file and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  // Cleanup
  window.URL.revokeObjectURL(url);
}
