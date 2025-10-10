import FinanceManager from "../../components/FinanceManager";
import { fmtCr } from "../../utils/number";
import type { FinanceRow } from "../../types";

export default function Characters({
  pcNames,
  pc,
  onPcChange,
  rows,
  onAdd,
  balance,
}: {
  pcNames: string[];
  pc: string;
  onPcChange: (name: string) => void;
  rows: FinanceRow[];
  onAdd: (rows: FinanceRow[]) => void;
  balance: number;
}) {
  const characterName = pc.split(" – ")[0]; // Extract first name before any " – " separator

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          className="select"
          value={pc}
          onChange={(e) => onPcChange(e.target.value)}
        >
          {pcNames.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <div className="text-sm">
          Current Balance:{" "}
          <span className="font-semibold">{fmtCr(balance || 0)}</span>
        </div>
      </div>

      <FinanceManager
        title={characterName}
        rows={rows}
        onUpdate={onAdd}
        fundName={`${characterName} Fund`}
        initialBalance={0}
        showSummary={true}
      />
    </div>
  );
}
