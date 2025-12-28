import Table from "./Table";
import FinanceSummary from "./FinanceSummary";
import TransactionForm from "./TransactionForm";
import {
  addTransaction,
  getCurrentBalance,
  getTransactionSummary,
} from "../../shared/utils/finance";
import { Wallet } from "lucide-react";
import type { FinanceRow } from "../../types";

interface FinanceManagerProps {
  title: string;
  rows: FinanceRow[];
  onUpdate: (rows: FinanceRow[]) => void;
  fundName: string;
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
  const currentBalance = getCurrentBalance(rows, initialBalance);
  const summary = getTransactionSummary(rows);

  const handleNewTransaction = (newTransaction: FinanceRow) => {
    const updatedRows = addTransaction(rows, newTransaction, initialBalance);
    onUpdate(updatedRows);
  };

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case "Expense":
        return 'bg-red-500/10 border-red-500/20 text-red-500';
      case "Income":
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500';
      default:
        return 'bg-primary/10 border-primary/20 text-primary';
    }
  };

  const displayRows = rows.map((row) => ({
    ...row,
    "Amount (Cr)": (
      <span className={`font-mono font-bold ${row.Category === "Expense" ? 'text-red-400' : 'text-emerald-400'}`}>
        {row.Category === "Expense" ? '-' : '+'}{Math.abs(row["Amount (Cr)"]).toLocaleString()}
      </span>
    ),
    "Running Total": (
      <span className="font-black text-primary">
        {(row["Running Total"] || 0).toLocaleString()} <span className="text-[10px] opacity-70">CR</span>
      </span>
    ),
    Category: (
      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${getCategoryStyles(row.Category)}`}>
        {row.Category}
      </span>
    )
  }));

  return (
    <div className="space-y-8 animate-hud">
      {showSummary && (
        <FinanceSummary
          title={title}
          totalIncome={summary.totalIncome}
          totalExpenses={summary.totalExpenses}
          netChange={summary.netChange}
          currentBalance={currentBalance}
        />
      )}

      <div className="grid grid-cols-1 gap-8">
        <TransactionForm
          title={title}
          fundName={fundName}
          onSubmit={handleNewTransaction}
        />

        <div className="hud-glass p-0 overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-white/5">
            <Wallet className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-black tracking-[0.2em] uppercase text-text-main">
              Fiscal <span className="text-primary">Ledger</span>
            </h3>
          </div>
          <Table
            columns={[
              "Date",
              "Description",
              "Category",
              "Amount (Cr)",
              "Running Total",
              "Notes",
            ]}
            rows={displayRows}
          />
        </div>
      </div>
    </div>
  );
}
