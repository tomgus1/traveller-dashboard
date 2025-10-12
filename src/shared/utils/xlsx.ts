import type * as ExcelJSTypes from "exceljs";
import type {
  CampaignState,
  FinanceRow,
  CargoRow,
  InventoryRow,
  MaintenanceLogRow,
  LoanRow,
  AmmoRow,
} from "../../types";
import { DEFAULT_STATE } from "../../infrastructure/storage/storage";

export async function importXlsx(
  file: File,
  setState: (s: CampaignState) => void
) {
  const ExcelJS = await import("exceljs");
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
    headerRow.eachCell((cell: ExcelJSTypes.Cell, colNumber: number) => {
      headers[colNumber - 1] = String(cell.value || "");
    });

    // Get data rows
    worksheet.eachRow((row: ExcelJSTypes.Row, rowNumber: number) => {
      if (rowNumber === 1) return; // Skip header row

      const rowData: Record<string, unknown> = {};
      row.eachCell((cell: ExcelJSTypes.Cell, colNumber: number) => {
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

  // Import character data from available sheets
  const worksheetNames = workbook.worksheets.map((ws) => ws.name);

  for (const sheetName of worksheetNames) {
    if (sheetName.endsWith("_Finance")) {
      const characterKey = sheetName.replace("_Finance", "");
      const financeRows = getSheetData(
        `${characterKey}_Finance`
      ) as FinanceRow[];

      // Initialize character if not exists
      if (!next.PCs[characterKey]) {
        next.PCs[characterKey] = {
          Finance: [],
          Inventory: [],
          Weapons: [],
          Armour: [],
          Ammo: [],
        };
      }

      next.PCs[characterKey].Finance = financeRows;

      // Also try to import other data for this character
      const inventoryRows = getSheetData(
        `${characterKey}_Inventory`
      ) as InventoryRow[];
      if (inventoryRows.length > 0) {
        next.PCs[characterKey].Inventory = inventoryRows;
      }
    }
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
  workbook: ExcelJSTypes.Workbook,
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
    .replace(/[\\/?*[\]:–—]/g, "_") // Include em dash and en dash
    .replace(/[^\w\s-_]/g, "_") // Replace any other special characters
    .trim();

  const worksheet = workbook.addWorksheet(safeName);

  // Add headers with simple formatting for better compatibility
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true };

  // Simpler fill that's more compatible
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFCCCCCC" }, // Light gray
  };

  // Add data rows
  cleanedRows.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header];
      // Ensure all values are properly typed for Excel
      if (typeof value === "number") {
        return value;
      }
      if (value === null || value === undefined) {
        return "";
      }
      return String(value);
    });
    worksheet.addRow(values);
  });

  // Set column widths for better readability
  worksheet.columns.forEach(
    (column: Partial<ExcelJSTypes.Column>, index: number) => {
      const header = headers[index];
      if (header) {
        // Set width based on header length, with reasonable min/max
        column.width = Math.min(Math.max(header.length + 2, 10), 30);
      }
    }
  );
};

const addMainSheets = (
  workbook: ExcelJSTypes.Workbook,
  state: CampaignState
) => {
  // Only add sheets that have data or meaningful headers
  addWorksheet(workbook, "Party_Finances", state.Party_Finances, [
    "Date",
    "Description",
    "Category",
    "Amount (Cr)",
  ]);
  addWorksheet(workbook, "Ship_Accounts", state.Ship_Accounts, [
    "Date",
    "Description",
    "Category",
    "Amount (Cr)",
  ]);
  addWorksheet(workbook, "Ship_Cargo", state.Ship_Cargo, [
    "Leg/Route",
    "Item",
    "Tons",
    "Purchase World",
    "Purchase Price (Cr/ton)",
    "Sale World",
    "Sale Price (Cr/ton)",
  ]);

  // Only add other sheets if they have data
  if (state.Ship_Maintenance_Log.length > 0) {
    addWorksheet(workbook, "Ship_Maintenance_Log", state.Ship_Maintenance_Log, [
      "Date",
      "Type",
      "Description",
      "Cost (Cr)",
    ]);
  }

  if (state.Loans_Mortgage.length > 0) {
    addWorksheet(workbook, "Loans_Mortgage", state.Loans_Mortgage, [
      "Loan Type",
      "Principal",
      "Interest Rate",
      "Monthly Payment",
      "Remaining Balance",
    ]);
  }

  if (state.Party_Inventory.length > 0) {
    addWorksheet(workbook, "Party_Inventory", state.Party_Inventory, [
      "Item",
      "Qty",
      "Unit Value (Cr)",
      "Total Value (Cr)",
    ]);
  }

  if (state.Ammo_Tracker.length > 0) {
    addWorksheet(workbook, "Ammo_Tracker", state.Ammo_Tracker, [
      "Weapon",
      "Ammo Type",
      "Magazine Size",
      "Rounds Loaded",
    ]);
  }
};

const addPCSheets = (workbook: ExcelJSTypes.Workbook, state: CampaignState) => {
  // Get all character entries from state instead of relying on PC_NAMES
  for (const [characterKey, pcData] of Object.entries(state.PCs)) {
    // Use character key for worksheet names, truncated for Excel compatibility
    const shortName =
      characterKey.length > 20 ? characterKey.substring(0, 20) : characterKey;

    // Always add Finance sheet (most important)
    addWorksheet(workbook, `${shortName}_Finance`, pcData.Finance || [], [
      "Date",
      "Description",
      "Category",
      "Amount (Cr)",
    ]);

    // Only add other sheets if they have data
    if (pcData.Inventory && pcData.Inventory.length > 0) {
      addWorksheet(workbook, `${shortName}_Inventory`, pcData.Inventory, [
        "Item",
        "Qty",
        "Unit Value (Cr)",
        "Total Value (Cr)",
      ]);
    }

    if (pcData.Weapons && pcData.Weapons.length > 0) {
      addWorksheet(workbook, `${shortName}_Weapons`, pcData.Weapons, [
        "Weapon",
        "Type",
        "Damage",
        "Range",
        "Mass",
        "Cost",
      ]);
    }

    if (pcData.Armour && pcData.Armour.length > 0) {
      addWorksheet(workbook, `${shortName}_Armour`, pcData.Armour, [
        "Armour",
        "Type",
        "Protection",
        "Mass",
        "Cost",
      ]);
    }

    if (pcData.Ammo && pcData.Ammo.length > 0) {
      addWorksheet(workbook, `${shortName}_Ammo`, pcData.Ammo, [
        "Weapon",
        "Ammo Type",
        "Magazine Size",
        "Rounds Loaded",
      ]);
    }
  }
};

export async function exportXlsx(state: CampaignState) {
  try {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();

    // Set workbook properties for better compatibility
    workbook.creator = "Traveller Campaign Dashboard";
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastPrinted = new Date();

    addMainSheets(workbook, state);
    addPCSheets(workbook, state);

    const filename = `Traveller_Campaign_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // Generate the file with specific options for better compatibility
    const buffer = await workbook.xlsx.writeBuffer({
      useSharedStrings: true,
      useStyles: true,
    });

    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";

    // Add to DOM, click, then cleanup
    document.body.appendChild(link);
    link.click();

    // Cleanup after a short delay
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Export failed: ${error.message}`);
    }
    throw new Error("Export failed: Unknown error");
  }
}
