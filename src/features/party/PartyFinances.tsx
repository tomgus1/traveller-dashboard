import { useState } from 'react'
import SectionCard from '../../components/SectionCard'
import Table from '../../components/Table'
import MoneyInput from '../../components/MoneyInput'
import { todayISO } from "../../utils/number";

export default function PartyFinances({
  rows,
  onAdd,
}: {
  rows: any[];
  onAdd: (r: any) => void;
}) {
  const [form, setForm] = useState({
    Date: todayISO(),
    Description: "",
    Category: "Expense",
    Subcategory: "",
    Amount: "",
    Notes: "",
  });
  return (
    <div className="space-y-4">
      <SectionCard title="Add Transaction">
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
          <input
            className="input"
            placeholder="Subcategory"
            value={form.Subcategory}
            onChange={(e) => setForm({ ...form, Subcategory: e.target.value })}
          />
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
              Subcategory: form.Subcategory,
              "Amount (Cr)": Number(form.Amount),
              "Paid By": "Party Fund",
              Notes: form.Notes,
            });
            setForm({
              ...form,
              Description: "",
              Subcategory: "",
              Amount: "",
              Notes: "",
            });
          }}
        >
          Add
        </button>
      </SectionCard>
      <Table
        columns={[
          "Date",
          "Description",
          "Category",
          "Subcategory",
          "Amount (Cr)",
          "Paid By",
          "Notes",
        ]}
        rows={rows}
      />
    </div>
  );
}
