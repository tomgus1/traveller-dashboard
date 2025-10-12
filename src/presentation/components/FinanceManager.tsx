import Table from "./Table";
import FinanceSummary from "./FinanceSummary";
import TransactionForm from "./TransactionForm";
import {
  addTransaction,
  getCurrentBalance,
  getTransactionSummary,
} from "../../shared/utils/finance";
import type { FinanceRow } from "../../types";

interface FinanceManagerProps {
  title: string;
  rows: FinanceRow[];
  onUpdate: (rows: FinanceRow[]) => void;
  fundName: string; // e.g., "Party Fund", "Ship Fund", "Ferric Fund"
  initialBalance?: number;
  showSummary?: boolean;
}

export default function FinanceManager({
  title,
  rows,
  onUpdate,
  fundName,
  initialBalance = 0,
  showSummary = true,
}: FinanceManagerProps) {
  // Calculate current balance and summary
  const currentBalance = getCurrentBalance(rows, initialBalance);
  const summary = getTransactionSummary(rows);

  const handleNewTransaction = (newTransaction: FinanceRow) => {
    const updatedRows = addTransaction(rows, newTransaction, initialBalance);
    onUpdate(updatedRows);
  };

  // Prepare rows for display with running totals
  const displayRows = rows.map((row) => ({
    ...row,
    "Amount (Cr)":
      row.Category === "Expense"
        ? -Math.abs(row["Amount (Cr)"])
        : Math.abs(row["Amount (Cr)"]),
  }));

  return (
    <div className="space-y-4">
      {/* Summary Section */}
      {showSummary && (
        <FinanceSummary
          title={title}
          totalIncome={summary.totalIncome}
          totalExpenses={summary.totalExpenses}
          netChange={summary.netChange}
          currentBalance={currentBalance}
        />
      )}

      {/* Add Transaction Form */}
      <TransactionForm
        title={title}
        fundName={fundName}
        onSubmit={handleNewTransaction}
      />

      {/* Transactions Table */}
      <Table
        columns={[
          "Date",
          "Description",
          "Category",
          "Subcategory",
          "Amount (Cr)",
          "Running Total",
          "Paid By",
          "Notes",
        ]}
        rows={displayRows}
      />
    </div>
  );
}
