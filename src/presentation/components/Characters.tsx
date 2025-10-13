import FinanceManager from "./FinanceManager";
import type { FinanceRow } from "../../types";

export default function Characters({
  pc,
  rows,
  onAdd,
}: {
  pc: string;
  rows: FinanceRow[];
  onAdd: (rows: FinanceRow[]) => void;
}) {
  const characterName = pc.includes(" – ") ? pc.split(" – ")[1] : pc; // Extract character name after " – " separator

  return (
    <div className="space-y-4">
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
