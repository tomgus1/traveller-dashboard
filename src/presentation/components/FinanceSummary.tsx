import SectionCard from "./SectionCard";
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
    <SectionCard title={`${title} Summary`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center">
          <div className="font-semibold text-green-600">Total Income</div>
          <div>{formatCurrency(totalIncome)}</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-red-600">Total Expenses</div>
          <div>{formatCurrency(totalExpenses)}</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-blue-600">Net Change</div>
          <div className={netChange >= 0 ? "text-green-600" : "text-red-600"}>
            {formatCurrency(netChange)}
          </div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-gray-600">Current Balance</div>
          <div
            className={currentBalance >= 0 ? "text-green-600" : "text-red-600"}
          >
            {formatCurrency(currentBalance)}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
