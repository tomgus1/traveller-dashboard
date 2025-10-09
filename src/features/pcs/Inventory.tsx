import { useState } from "react";
import SectionCard from "../../components/SectionCard";
import Table from "../../components/Table";
import type { InventoryRow } from "../../types";

export default function Inventory({
  rows,
  onAdd,
}: {
  rows: InventoryRow[];
  onAdd: (r: InventoryRow) => void;
}) {
  const [form, setForm] = useState({
    Item: "",
    Qty: "",
    "Unit Mass (kg)": "",
    "Unit Value (Cr)": "",
    "Location/Container": "",
    Notes: "",
  });

  const add = () => {
    if (!form.Item || form.Qty === "") return;
    const qty = Number(form.Qty || 0);
    const um = Number(form["Unit Mass (kg)"] || 0);
    const uv = Number(form["Unit Value (Cr)"] || 0);
    onAdd({
      Item: form.Item,
      Qty: qty,
      "Unit Mass (kg)": um,
      "Total Mass (kg)": qty * um,
      "Unit Value (Cr)": uv,
      "Total Value (Cr)": qty * uv,
      "Location/Container": form["Location/Container"],
      Notes: form.Notes,
    });
    setForm({
      Item: "",
      Qty: "",
      "Unit Mass (kg)": "",
      "Unit Value (Cr)": "",
      "Location/Container": "",
      Notes: "",
    });
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Add Inventory Item">
        <div className="grid md:grid-cols-3 gap-3">
          <input
            className="input"
            placeholder="Item"
            value={form.Item}
            onChange={(e) => setForm({ ...form, Item: e.target.value })}
          />
          <input
            className="input"
            placeholder="Qty"
            type="number"
            value={form.Qty}
            onChange={(e) => setForm({ ...form, Qty: e.target.value })}
          />
          <input
            className="input"
            placeholder="Unit Mass (kg)"
            type="number"
            value={form["Unit Mass (kg)"]}
            onChange={(e) =>
              setForm({ ...form, "Unit Mass (kg)": e.target.value })
            }
          />
          <input
            className="input"
            placeholder="Unit Value (Cr)"
            type="number"
            value={form["Unit Value (Cr)"]}
            onChange={(e) =>
              setForm({ ...form, "Unit Value (Cr)": e.target.value })
            }
          />
          <input
            className="input"
            placeholder="Location/Container"
            value={form["Location/Container"]}
            onChange={(e) =>
              setForm({ ...form, "Location/Container": e.target.value })
            }
          />
          <input
            className="input"
            placeholder="Notes"
            value={form.Notes}
            onChange={(e) => setForm({ ...form, Notes: e.target.value })}
          />
        </div>
        <button className="btn mt-2" onClick={add}>
          Add
        </button>
      </SectionCard>

      <Table
        columns={[
          "Item",
          "Qty",
          "Unit Mass (kg)",
          "Total Mass (kg)",
          "Unit Value (Cr)",
          "Total Value (Cr)",
          "Location/Container",
          "Notes",
        ]}
        rows={rows}
      />
    </div>
  );
}
