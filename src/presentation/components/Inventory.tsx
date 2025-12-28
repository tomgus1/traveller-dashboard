import Table from "./Table";
import FormField from "./FormField";
import { useForm } from "../hooks/useForm";
import { Plus, Package } from "lucide-react";
import type { InventoryRow } from "../../types";

type InventoryFormData = Record<string, string> & {
  Item: string;
  Qty: string;
  "Unit Mass (kg)": string;
  "Unit Value (Cr)": string;
  "Location/Container": string;
  Notes: string;
};

const INITIAL_FORM: InventoryFormData = {
  Item: "",
  Qty: "",
  "Unit Mass (kg)": "",
  "Unit Value (Cr)": "",
  "Location/Container": "",
  Notes: "",
};

export default function Inventory({
  rows,
  onAdd,
}: {
  rows: InventoryRow[];
  onAdd: (r: InventoryRow) => void;
}) {
  const { form, createInputHandler, resetForm } = useForm(INITIAL_FORM);

  const handleSubmit = () => {
    if (!form.Item || form.Qty === "") return;

    const qty = Number(form.Qty || 0);
    const unitMass = Number(form["Unit Mass (kg)"] || 0);
    const unitValue = Number(form["Unit Value (Cr)"] || 0);

    onAdd({
      Item: form.Item as string,
      Qty: qty,
      "Unit Mass (kg)": unitMass,
      "Total Mass (kg)": qty * unitMass,
      "Unit Value (Cr)": unitValue,
      "Total Value (Cr)": qty * unitValue,
      "Location/Container": form["Location/Container"] as string,
      Notes: form.Notes as string,
    });

    resetForm();
  };

  const totalWeight = rows.reduce((acc, row) => acc + (row["Total Mass (kg)"] || 0), 0);
  const totalValue = rows.reduce((acc, row) => acc + (row["Total Value (Cr)"] || 0), 0);

  return (
    <div className="space-y-6">
      <div className="hud-glass p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-black tracking-[0.2em] uppercase text-text-main">
              Gear <span className="text-primary">Manifest</span>
            </h3>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black text-muted uppercase tracking-widest">Payload</p>
              <p className="text-xs font-bold">{totalWeight.toFixed(1)} <span className="text-[10px] text-muted font-black">KG</span></p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-muted uppercase tracking-widest">Valuation</p>
              <p className="text-xs font-bold text-emerald-400">{totalValue.toLocaleString()} <span className="text-[10px] text-emerald-500 font-black">CR</span></p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <FormField
              placeholder="Item Name"
              value={form.Item}
              onChange={createInputHandler("Item")}
            />
          </div>
          <FormField
            type="number"
            placeholder="Quantity"
            value={form.Qty}
            onChange={createInputHandler("Qty")}
          />
          <FormField
            type="number"
            placeholder="Mass (kg)"
            value={form["Unit Mass (kg)"]}
            onChange={createInputHandler("Unit Mass (kg)")}
          />
          <button
            onClick={handleSubmit}
            className="btn-hud py-2.5 flex items-center justify-center gap-2 group"
            type="button"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Register</span>
          </button>
        </div>
      </div>

      <div className="hud-glass p-0 overflow-hidden">
        <Table
          columns={[
            "Item",
            "Qty",
            "Unit Mass (kg)",
            "Total Mass (kg)",
            "Location/Container",
            "Notes",
          ]}
          rows={rows}
        />
      </div>
    </div>
  );
}
