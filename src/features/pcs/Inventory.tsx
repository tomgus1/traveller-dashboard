import SectionCard from "../../components/SectionCard";
import Table from "../../components/Table";
import FormField from "../../components/FormField";
import { useForm } from "../../hooks/useForm";
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

  return (
    <div className="space-y-4">
      <SectionCard title="Add Inventory Item">
        <div className="grid md:grid-cols-3 gap-3">
          <FormField
            placeholder="Item"
            value={form.Item}
            onChange={createInputHandler("Item")}
          />
          <FormField
            type="number"
            placeholder="Qty"
            value={form.Qty}
            onChange={createInputHandler("Qty")}
          />
          <FormField
            type="number"
            placeholder="Unit Mass (kg)"
            value={form["Unit Mass (kg)"]}
            onChange={createInputHandler("Unit Mass (kg)")}
          />
          <FormField
            type="number"
            placeholder="Unit Value (Cr)"
            value={form["Unit Value (Cr)"]}
            onChange={createInputHandler("Unit Value (Cr)")}
          />
          <FormField
            placeholder="Location/Container"
            value={form["Location/Container"]}
            onChange={createInputHandler("Location/Container")}
          />
          <FormField
            placeholder="Notes"
            value={form.Notes}
            onChange={createInputHandler("Notes")}
          />
        </div>
        <button className="btn mt-2" onClick={handleSubmit}>
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
