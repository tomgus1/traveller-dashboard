import type { FinanceRow } from "../../types";

/**
 * Transaction types and their effects on balance
 */
export const TRANSACTION_EFFECTS = {
  Income: 1, // Adds to balance
  Expense: -1, // Subtracts from balance
  Transfer: 0, // Neutral (handled separately)
} as const;

/**
 * Calculate the running total for a list of financial transactions
 * @param rows Array of finance rows
 * @param initialBalance Starting balance (default: 0)
 * @returns Array of rows with calculated "Running Total" field
 */
export function calculateRunningTotals(
  rows: FinanceRow[],
  initialBalance = 0
): FinanceRow[] {
  let runningTotal = initialBalance;

  return rows.map((row) => {
    const amount = row["Amount (Cr)"];
    const category = row.Category;

    // Calculate the effect on balance based on transaction type
    if (category === "Income") {
      runningTotal += amount;
    } else if (category === "Expense") {
      runningTotal -= amount;
    }
    // Transfer transactions are neutral - they don't affect the total
    // (transfers should be handled between different accounts)

    return {
      ...row,
      "Running Total": runningTotal,
    };
  });
}

/**
 * Get the current balance from a list of financial transactions
 * @param rows Array of finance rows
 * @param initialBalance Starting balance (default: 0)
 * @returns Current balance after all transactions
 */
export function getCurrentBalance(
  rows: FinanceRow[],
  initialBalance = 0
): number {
  return rows.reduce((total, row) => {
    const amount = row["Amount (Cr)"];
    const category = row.Category;

    if (category === "Income") {
      return total + amount;
    } else if (category === "Expense") {
      return total - amount;
    }
    // Transfer transactions don't affect balance
    return total;
  }, initialBalance);
}

/**
 * Add a new transaction and recalculate running totals
 * @param existingRows Current transactions
 * @param newTransaction New transaction to add
 * @param initialBalance Starting balance (default: 0)
 * @returns Updated array with new transaction and recalculated totals
 */
export function addTransaction(
  existingRows: FinanceRow[],
  newTransaction: FinanceRow,
  initialBalance = 0
): FinanceRow[] {
  const allRows = [...existingRows, newTransaction];

  // Sort by date to maintain chronological order
  allRows.sort(
    (a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime()
  );

  return calculateRunningTotals(allRows, initialBalance);
}

/**
 * Validate a financial transaction
 * @param transaction Transaction to validate
 * @returns Object with isValid flag and error messages
 */
export function validateTransaction(transaction: Partial<FinanceRow>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!transaction.Description?.trim()) {
    errors.push("Description is required");
  }

  if (!transaction.Date) {
    errors.push("Date is required");
  }

  if (
    transaction["Amount (Cr)"] === undefined ||
    transaction["Amount (Cr)"] === null
  ) {
    errors.push("Amount is required");
  }

  if (
    typeof transaction["Amount (Cr)"] === "number" &&
    transaction["Amount (Cr)"] < 0
  ) {
    errors.push(
      "Amount must be positive (use Expense category for negative impact)"
    );
  }

  if (!["Income", "Expense", "Transfer"].includes(transaction.Category || "")) {
    errors.push("Category must be Income, Expense, or Transfer");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Format currency for display
 * @param amount Amount in credits
 * @returns Formatted string with "Cr" suffix
 */
export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString()} Cr`;
}

/**
 * Calculate transaction summary statistics
 * @param rows Array of finance rows
 * @returns Summary object with income, expenses, and net
 */
export function getTransactionSummary(rows: FinanceRow[]): {
  totalIncome: number;
  totalExpenses: number;
  netChange: number;
  transactionCount: number;
} {
  const summary = rows.reduce(
    (acc, row) => {
      const amount = row["Amount (Cr)"];

      if (row.Category === "Income") {
        acc.totalIncome += amount;
      } else if (row.Category === "Expense") {
        acc.totalExpenses += amount;
      }

      acc.transactionCount++;
      return acc;
    },
    { totalIncome: 0, totalExpenses: 0, transactionCount: 0 }
  );

  return {
    ...summary,
    netChange: summary.totalIncome - summary.totalExpenses,
  };
}
