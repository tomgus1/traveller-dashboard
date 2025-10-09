import { useState } from "react";
import SectionCard from "../../components/SectionCard";
import Table from "../../components/Table";
import MoneyInput from "../../components/MoneyInput";
import { fmtCr, todayISO } from "../../utils/number";
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
  onAdd: (r: FinanceRow) => void;
  balance: number;
}) {
  const [form, setForm] = useState({
    Date: todayISO(),
    Description: "",
    Category: "Expense",
    Amount: "",
    Notes: "",
  });

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
          Balance: <span className="font-semibold">{fmtCr(balance || 0)}</span>
        </div>
      </div>

      <SectionCard title={`Add ${pc.split(" – ")[0]}'s Transaction`}>
        <div className="grid md:grid-cols-3 gap-3">
          <input
            type="date"
            className="input"
            value={form.Date}
            onChange={(e) => setForm({ ...form, Date: e.target.value })}
          />
          <input
            className="input"
            placeholder="Description"
            value={form.Description}
            onChange={(e) => setForm({ ...form, Description: e.target.value })}
          />
          <select
            className="select"
            value={form.Category}
            onChange={(e) => setForm({ ...form, Category: e.target.value })}
          >
            <option>Income</option>
            <option>Expense</option>
            <option>Transfer</option>
          </select>
          <MoneyInput
            value={form.Amount}
            onChange={(v) => setForm({ ...form, Amount: v })}
            placeholder="Amount (Cr)"
          />
          <input
            className="input"
            placeholder="Notes"
            value={form.Notes}
            onChange={(e) => setForm({ ...form, Notes: e.target.value })}
          />
        </div>
        <button
          className="btn mt-2"
          onClick={() => {
            if (!form.Description || form.Amount === "") return;
            onAdd({
              Date: form.Date,
              Description: form.Description,
              Category: form.Category,
              "Amount (Cr)": Number(form.Amount),
              Notes: form.Notes,
            });
            setForm({ ...form, Description: "", Amount: "", Notes: "" });
          }}
        >
          Add
        </button>
      </SectionCard>

      <Table
        columns={["Date", "Description", "Category", "Amount (Cr)", "Notes"]}
        rows={rows}
      />
    </div>
  );
}
