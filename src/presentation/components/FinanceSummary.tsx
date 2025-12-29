import { formatCurrency } from "../../shared/utils/finance";
import { TrendingUp, TrendingDown, RefreshCcw, Landmark } from "lucide-react";

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
  const items = [
    { label: "Total Revenue", value: totalIncome, icon: <TrendingUp className="w-4 h-4" />, color: "text-emerald-400" },
    { label: "Total Outflow", value: totalExpenses, icon: <TrendingDown className="w-4 h-4" />, color: "text-red-400" },
    { label: "Net Variance", value: netChange, icon: <RefreshCcw className="w-4 h-4" />, color: netChange >= 0 ? "text-emerald-400" : "text-red-400" },
    { label: "Current Assets", value: currentBalance, icon: <Landmark className="w-4 h-4" />, color: currentBalance >= 0 ? "text-emerald-400" : "text-red-400" },
  ];

  return (
    <div className="hud-glass p-6">
      <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
        <div className="w-1.5 h-6 bg-primary" />
        <h3 className="text-sm font-black tracking-[0.2em] uppercase text-text-main">
          {title} <span className="text-muted">Financial_Audit</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {items.map((item, idx) => (
          <div key={item.label} className="space-y-3 relative group">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 bg-surface-low ${item.color}`}>
                {item.icon}
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-text-main transition-colors">
                {item.label}
              </p>
            </div>

            <div className="pl-1">
              <h4 className={`text-2xl font-black tracking-tight ${item.color}`}>
                {formatCurrency(item.value)}
              </h4>
            </div>

            {idx < items.length - 1 && (
              <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 w-[1px] h-10 bg-white/5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
