import { formatCurrency } from "../../shared/utils/finance";

interface FinanceSummaryProps {
  title: string;
  totalIncome: number;
  totalExpenses: number;
  netChange: number;
  currentBalance: number;
}

export default function FinanceSummary({
  title,
  totalIncome,
  totalExpenses,
  netChange,
  currentBalance,
}: FinanceSummaryProps) {
  return (
    <div className="card-modern">
      <h3 className="text-zinc-500 font-medium mb-4">{title} Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="space-y-1">
          <div className="text-xs text-muted uppercase font-bold tracking-tight">Total Income</div>
          <div className="text-xl font-bold text-green-500">{formatCurrency(totalIncome)}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-muted uppercase font-bold tracking-tight">Total Expenses</div>
          <div className="text-xl font-bold text-red-500">{formatCurrency(totalExpenses)}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-muted uppercase font-bold tracking-tight">Net Change</div>
          <div className={`text-xl font-bold ${netChange >= 0 ? "text-green-500" : "text-red-500"}`}>
            {formatCurrency(netChange)}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-muted uppercase font-bold tracking-tight">Current Balance</div>
          <div className={`text-xl font-bold ${currentBalance >= 0 ? "text-green-500" : "text-red-500"}`}>
            {formatCurrency(currentBalance)}
          </div>
        </div>
      </div>
    </div>
  );
}
