import { getCurrentBalance } from "../src/shared/utils/finance";
import type { FinanceRow } from "../src/types";

describe("Balance Fix Integration Test", () => {
  it("should calculate party/ship balances correctly like in the screenshot", () => {
    // Simulate the transactions from the screenshot
    const partyTransactions: FinanceRow[] = [
      {
        Date: "2025-10-10",
        Description: "test",
        Category: "Income",
        Subcategory: "test initial income",
        "Amount (Cr)": 1000000,
        "Paid By": "Party Fund",
      },
      {
        Date: "2025-10-10",
        Description: "medical fees",
        Category: "Expense",
        Subcategory: "fees",
        "Amount (Cr)": 5000,
        "Paid By": "Party Fund",
      },
    ];

    const balance = getCurrentBalance(partyTransactions, 0);

    // Should be 1,000,000 - 5,000 = 995,000 (not 1,005,000 like the bug showed)
    expect(balance).toBe(995000);
  });

  it("should handle ship transactions correctly too", () => {
    const shipTransactions: FinanceRow[] = [
      {
        Date: "2025-10-10",
        Description: "Ship income",
        Category: "Income",
        "Amount (Cr)": 500000,
        "Paid From (Fund)": "Ship Fund",
      },
      {
        Date: "2025-10-10",
        Description: "Ship maintenance",
        Category: "Expense",
        "Amount (Cr)": 50000,
        "Paid From (Fund)": "Ship Fund",
      },
    ];

    const balance = getCurrentBalance(shipTransactions, 0);

    // Should be 500,000 - 50,000 = 450,000
    expect(balance).toBe(450000);
  });

  it("should handle empty transactions (new accounts)", () => {
    const balance = getCurrentBalance([], 0);
    expect(balance).toBe(0);
  });
});
