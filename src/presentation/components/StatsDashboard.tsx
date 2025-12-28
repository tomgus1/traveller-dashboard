import { fmtCr } from "../../shared/utils/number";
import { Wallet, Ship, Package, Users } from "lucide-react";

interface StatsDashboardProps {
  partyBalance: number;
  shipBalance: number;
  cargoLegsCount: number;
  characterCount: number;
}

export default function StatsDashboard({
  partyBalance,
  shipBalance,
  cargoLegsCount,
  characterCount,
}: StatsDashboardProps) {
  const stats = [
    { label: "Party Fund", value: fmtCr(partyBalance), icon: <Wallet className="w-5 h-5" />, color: "text-primary" },
    { label: "Ship Fund", value: fmtCr(shipBalance), icon: <Ship className="w-5 h-5" />, color: "text-blue-400" },
    { label: "Active Cargo", value: cargoLegsCount, icon: <Package className="w-5 h-5" />, color: "text-amber-400" },
    { label: "Personnel", value: characterCount, icon: <Users className="w-5 h-5" />, color: "text-emerald-400" },
  ];

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      role="region"
      aria-label="Campaign statistics"
    >
      {stats.map((stat, idx) => (
        <div
          key={stat.label}
          className="hud-glass p-5 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          {/* Subtle Accent Line */}
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/30 group-hover:bg-primary transition-colors" />

          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted group-hover:text-text-main transition-colors">
                {stat.label}
              </p>
              <h3 className="text-2xl font-black tracking-tight font-heading">
                {stat.value}
              </h3>
            </div>

            <div className={`p-2.5 rounded-xl bg-white/5 ${stat.color} shadow-inner`}>
              {stat.icon}
            </div>
          </div>

          {/* HUD Decoration */}
          <div className="absolute bottom-1 right-1 opacity-20 group-hover:opacity-100 transition-opacity">
            <div className="w-4 h-4 border-r-2 border-b-2 border-primary/40" />
          </div>
        </div>
      ))}
    </div>
  );
}
