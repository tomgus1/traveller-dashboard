import { fmtCr } from "../../shared/utils/number";

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
  return (
    <div
      className="grid md:grid-cols-4 gap-4"
      role="region"
      aria-label="Campaign statistics"
    >
      <div className="card">
        <div className="text-xs text-zinc-500">Party Fund</div>
        <div
          className="text-xl font-semibold"
          aria-label={`Party fund balance: ${fmtCr(partyBalance)}`}
        >
          {fmtCr(partyBalance)}
        </div>
      </div>
      <div className="card">
        <div className="text-xs text-zinc-500">Ship Fund</div>
        <div
          className="text-xl font-semibold"
          aria-label={`Ship fund balance: ${fmtCr(shipBalance)}`}
        >
          {fmtCr(shipBalance)}
        </div>
      </div>
      <div className="card">
        <div className="text-xs text-zinc-500">Cargo Legs</div>
        <div
          className="text-xl font-semibold"
          aria-label={`Number of cargo legs: ${cargoLegsCount}`}
        >
          {cargoLegsCount}
        </div>
      </div>
      <div className="card">
        <div className="text-xs text-zinc-500">PCs Tracked</div>
        <div
          className="text-xl font-semibold"
          aria-label={`Number of player characters tracked: ${characterCount}`}
        >
          {characterCount}
        </div>
      </div>
    </div>
  );
}
