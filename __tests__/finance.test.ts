import {
  calculateRunningTotals,
  getCurrentBalance,
  addTransaction,
  validateTransaction,
  formatCurrency,
  getTransactionSummary,
  TRANSACTION_EFFECTS,
} from "../src/shared/utils/finance";
import type { FinanceRow } from "../src/types";

describe("Finance Utilities", () => {
  const sampleTransactions: FinanceRow[] = [
    {
      Date: "2024-01-01",
      Description: "Initial income",
      Category: "Income",
      "Amount (Cr)": 1000,
    },
    {
      Date: "2024-01-02",
      Description: "Equipment purchase",
      Category: "Expense",
      "Amount (Cr)": 200,
    },
    {
      Date: "2024-01-03",
      Description: "Money transfer",
      Category: "Transfer",
      "Amount (Cr)": 100,
    },
  ];

  describe("TRANSACTION_EFFECTS", () => {
    it("should have correct effect values for each transaction type", () => {
      expect(TRANSACTION_EFFECTS.Income).toBe(1);
      expect(TRANSACTION_EFFECTS.Expense).toBe(-1);
      expect(TRANSACTION_EFFECTS.Transfer).toBe(0);
    });
  });

  describe("calculateRunningTotals", () => {
    it("should calculate running totals correctly with default initial balance", () => {
      const result = calculateRunningTotals(sampleTransactions);

      expect(result).toHaveLength(3);
      expect(result[0]["Running Total"]).toBe(1000); // Income: 0 + 1000 = 1000
      expect(result[1]["Running Total"]).toBe(800); // Expense: 1000 - 200 = 800
      expect(result[2]["Running Total"]).toBe(800); // Transfer: 800 + 0 = 800
    });

    it("should calculate running totals with custom initial balance", () => {
      const initialBalance = 500;
      const result = calculateRunningTotals(sampleTransactions, initialBalance);

      expect(result[0]["Running Total"]).toBe(1500); // Income: 500 + 1000 = 1500
      expect(result[1]["Running Total"]).toBe(1300); // Expense: 1500 - 200 = 1300
      expect(result[2]["Running Total"]).toBe(1300); // Transfer: 1300 + 0 = 1300
    });

    it("should handle empty transactions array", () => {
      const result = calculateRunningTotals([]);
      expect(result).toEqual([]);
    });

    it("should preserve original transaction data while adding running total", () => {
      const result = calculateRunningTotals(sampleTransactions);

      // Check that original data is preserved
      expect(result[0].Date).toBe("2024-01-01");
      expect(result[0].Description).toBe("Initial income");
      expect(result[0].Category).toBe("Income");
      expect(result[0]["Amount (Cr)"]).toBe(1000);
    });
  });

  describe("getCurrentBalance", () => {
    it("should calculate current balance correctly", () => {
      const balance = getCurrentBalance(sampleTransactions);
      expect(balance).toBe(800); // 1000 (income) - 200 (expense) + 0 (transfer) = 800
    });

    it("should calculate balance with initial balance", () => {
      const balance = getCurrentBalance(sampleTransactions, 500);
      expect(balance).toBe(1300); // 500 + 1000 - 200 + 0 = 1300
    });

    it("should return initial balance for empty transactions", () => {
      expect(getCurrentBalance([])).toBe(0);
      expect(getCurrentBalance([], 100)).toBe(100);
    });

    it("should handle negative balances", () => {
      const expensiveTransactions: FinanceRow[] = [
        {
          Date: "2024-01-01",
          Description: "Big expense",
          Category: "Expense",
          "Amount (Cr)": 1500,
        },
      ];

      const balance = getCurrentBalance(expensiveTransactions, 1000);
      expect(balance).toBe(-500); // 1000 - 1500 = -500
    });
  });

  describe("addTransaction", () => {
    it("should add transaction and recalculate running totals", () => {
      const newTransaction: FinanceRow = {
        Date: "2024-01-04",
        Description: "New income",
        Category: "Income",
        "Amount (Cr)": 300,
      };

      const result = addTransaction(sampleTransactions, newTransaction);

      expect(result).toHaveLength(4);
      expect(result[3].Description).toBe("New income");
      expect(result[3]["Running Total"]).toBe(1100); // 800 + 300 = 1100
    });

    it("should sort transactions by date chronologically", () => {
      const newTransaction: FinanceRow = {
        Date: "2023-12-31", // Earlier date
        Description: "Earlier transaction",
        Category: "Income",
        "Amount (Cr)": 100,
      };

      const result = addTransaction(sampleTransactions, newTransaction);

      expect(result[0].Date).toBe("2023-12-31");
      expect(result[0].Description).toBe("Earlier transaction");
    });

    it("should handle adding to empty transactions array", () => {
      const newTransaction: FinanceRow = {
        Date: "2024-01-01",
        Description: "First transaction",
        Category: "Income",
        "Amount (Cr)": 500,
      };

      const result = addTransaction([], newTransaction);

      expect(result).toHaveLength(1);
      expect(result[0]["Running Total"]).toBe(500);
    });
  });

  describe("validateTransaction", () => {
    it("should validate a correct transaction", () => {
      const validTransaction: FinanceRow = {
        Date: "2024-01-01",
        Description: "Valid transaction",
        Category: "Income",
        "Amount (Cr)": 100,
      };

      const result = validateTransaction(validTransaction);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject transaction without description", () => {
      const invalidTransaction = {
        Date: "2024-01-01",
        Description: "",
        Category: "Income",
        "Amount (Cr)": 100,
      };

      const result = validateTransaction(invalidTransaction);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Description is required");
    });

    it("should reject transaction without date", () => {
      const invalidTransaction = {
        Description: "Test",
        Category: "Income",
        "Amount (Cr)": 100,
      };

      const result = validateTransaction(invalidTransaction);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Date is required");
    });

    it("should reject transaction without amount", () => {
      const invalidTransaction = {
        Date: "2024-01-01",
        Description: "Test",
        Category: "Income",
      };

      const result = validateTransaction(invalidTransaction);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Amount is required");
    });

    it("should reject transaction with negative amount", () => {
      const invalidTransaction = {
        Date: "2024-01-01",
        Description: "Test",
        Category: "Income",
        "Amount (Cr)": -100,
      };

      const result = validateTransaction(invalidTransaction);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Amount must be positive (use Expense category for negative impact)"
      );
    });

    it("should reject transaction with invalid category", () => {
      const invalidTransaction = {
        Date: "2024-01-01",
        Description: "Test",
        Category: "InvalidCategory",
        "Amount (Cr)": 100,
      };

      const result = validateTransaction(invalidTransaction);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Category must be Income, Expense, or Transfer"
      );
    });

    it("should collect multiple validation errors", () => {
      const invalidTransaction = {
        Description: "",
        Category: "InvalidCategory",
        "Amount (Cr)": -100,
      };

      const result = validateTransaction(invalidTransaction);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4); // description, date, amount negative, category
    });
  });

  describe("formatCurrency", () => {
    it("should format currency correctly", () => {
      expect(formatCurrency(1000)).toBe("1,000 Cr");
      expect(formatCurrency(1234567)).toBe("1,234,567 Cr");
      expect(formatCurrency(0)).toBe("0 Cr");
      expect(formatCurrency(42)).toBe("42 Cr");
    });

    it("should handle negative amounts", () => {
      expect(formatCurrency(-1000)).toBe("-1,000 Cr");
      expect(formatCurrency(-1234567)).toBe("-1,234,567 Cr");
    });

    it("should handle decimal amounts", () => {
      expect(formatCurrency(1000.5)).toBe("1,000.5 Cr");
      expect(formatCurrency(1234.67)).toBe("1,234.67 Cr");
    });
  });

  describe("getTransactionSummary", () => {
    it("should calculate transaction summary correctly", () => {
      const summary = getTransactionSummary(sampleTransactions);

      expect(summary.totalIncome).toBe(1000);
      expect(summary.totalExpenses).toBe(200);
      expect(summary.netChange).toBe(800); // 1000 - 200
      expect(summary.transactionCount).toBe(3);
    });

    it("should handle empty transactions", () => {
      const summary = getTransactionSummary([]);

      expect(summary.totalIncome).toBe(0);
      expect(summary.totalExpenses).toBe(0);
      expect(summary.netChange).toBe(0);
      expect(summary.transactionCount).toBe(0);
    });

    it("should handle only income transactions", () => {
      const incomeOnlyTransactions: FinanceRow[] = [
        {
          Date: "2024-01-01",
          Description: "Income 1",
          Category: "Income",
          "Amount (Cr)": 500,
        },
        {
          Date: "2024-01-02",
          Description: "Income 2",
          Category: "Income",
          "Amount (Cr)": 300,
        },
      ];

      const summary = getTransactionSummary(incomeOnlyTransactions);

      expect(summary.totalIncome).toBe(800);
      expect(summary.totalExpenses).toBe(0);
      expect(summary.netChange).toBe(800);
      expect(summary.transactionCount).toBe(2);
    });

    it("should handle only expense transactions", () => {
      const expenseOnlyTransactions: FinanceRow[] = [
        {
          Date: "2024-01-01",
          Description: "Expense 1",
          Category: "Expense",
          "Amount (Cr)": 200,
        },
        {
          Date: "2024-01-02",
          Description: "Expense 2",
          Category: "Expense",
          "Amount (Cr)": 150,
        },
      ];

      const summary = getTransactionSummary(expenseOnlyTransactions);

      expect(summary.totalIncome).toBe(0);
      expect(summary.totalExpenses).toBe(350);
      expect(summary.netChange).toBe(-350);
      expect(summary.transactionCount).toBe(2);
    });

    it("should ignore transfer transactions in totals but count them", () => {
      const transferOnlyTransactions: FinanceRow[] = [
        {
          Date: "2024-01-01",
          Description: "Transfer 1",
          Category: "Transfer",
          "Amount (Cr)": 100,
        },
        {
          Date: "2024-01-02",
          Description: "Transfer 2",
          Category: "Transfer",
          "Amount (Cr)": 200,
        },
      ];

      const summary = getTransactionSummary(transferOnlyTransactions);

      expect(summary.totalIncome).toBe(0);
      expect(summary.totalExpenses).toBe(0);
      expect(summary.netChange).toBe(0);
      expect(summary.transactionCount).toBe(2);
    });
  });

  describe("Edge Cases and Integration", () => {
    it("should handle transactions with zero amounts", () => {
      const zeroAmountTransaction: FinanceRow = {
        Date: "2024-01-01",
        Description: "Zero amount",
        Category: "Income",
        "Amount (Cr)": 0,
      };

      const result = addTransaction([], zeroAmountTransaction);
      expect(result[0]["Running Total"]).toBe(0);

      const balance = getCurrentBalance([zeroAmountTransaction]);
      expect(balance).toBe(0);
    });

    it("should handle very large amounts", () => {
      const largeAmountTransaction: FinanceRow = {
        Date: "2024-01-01",
        Description: "Large amount",
        Category: "Income",
        "Amount (Cr)": 999999999,
      };

      const balance = getCurrentBalance([largeAmountTransaction]);
      expect(balance).toBe(999999999);

      const formatted = formatCurrency(999999999);
      expect(formatted).toBe("999,999,999 Cr");
    });

    it("should maintain data integrity through multiple operations", () => {
      let transactions: FinanceRow[] = [];

      // Add multiple transactions
      const transaction1: FinanceRow = {
        Date: "2024-01-01",
        Description: "First",
        Category: "Income",
        "Amount (Cr)": 1000,
      };

      const transaction2: FinanceRow = {
        Date: "2024-01-02",
        Description: "Second",
        Category: "Expense",
        "Amount (Cr)": 300,
      };

      transactions = addTransaction(transactions, transaction1);
      transactions = addTransaction(transactions, transaction2);

      expect(transactions).toHaveLength(2);
      expect(getCurrentBalance(transactions)).toBe(700);

      const summary = getTransactionSummary(transactions);
      expect(summary.totalIncome).toBe(1000);
      expect(summary.totalExpenses).toBe(300);
      expect(summary.netChange).toBe(700);
    });
  });
});
