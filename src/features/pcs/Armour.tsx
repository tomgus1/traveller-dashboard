import SectionCard from "../../components/SectionCard";
import Table from "../../components/Table";
import FormField from "../../components/FormField";
import { useForm } from "../../hooks/useForm";
import type { ArmourRow } from "../../types";

type ArmourFormData = Record<string, string> & {
  Armour: string;
  Type: string;
  Protection: string;
  Mass: string;
  Cost: string;
  Notes: string;
};

const INITIAL_FORM: ArmourFormData = {
  Armour: "",
  Type: "",
  Protection: "",
  Mass: "",
  Cost: "",
  Notes: "",
};

export default function Armour({
  rows,
  onAdd,
}: {
  rows: ArmourRow[];
  onAdd: (r: ArmourRow) => void;
}) {
  const { form, createInputHandler, resetForm } = useForm(INITIAL_FORM);

  const handleSubmit = () => {
    if (!form.Armour) return;

    onAdd({
      Armour: form.Armour as string,
      Type: form.Type as string,
      Protection: form.Protection
        ? Number(form.Protection)
        : (form.Protection as string),
      Mass: form.Mass ? Number(form.Mass) : (form.Mass as string),
      Cost: form.Cost ? Number(form.Cost) : undefined,
      Notes: form.Notes as string,
    });

    resetForm();
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Add Armour Entry">
        <div className="grid md:grid-cols-3 gap-3">
          <FormField
            placeholder="Armour Name"
            value={form.Armour}
            onChange={createInputHandler("Armour")}
          />
          <FormField
            type="select"
            value={form.Type}
            onChange={createInputHandler("Type")}
          >
            <option value="">Select Type</option>
            <option value="Cloth">Cloth</option>
            <option value="Mesh">Mesh</option>
            <option value="Flak Jacket">Flak Jacket</option>
            <option value="Combat Armour">Combat Armour</option>
            <option value="Battle Dress">Battle Dress</option>
            <option value="Powered Armour">Powered Armour</option>
            <option value="Vacc Suit">Vacc Suit</option>
            <option value="Environmental Suit">Environmental Suit</option>
            <option value="Other">Other</option>
          </FormField>
          <FormField
            placeholder="Protection (e.g., +5, 1d6+2)"
            value={form.Protection}
            onChange={createInputHandler("Protection")}
          />
          <FormField
            placeholder="Mass (kg)"
            value={form.Mass}
            onChange={createInputHandler("Mass")}
          />
          <FormField
            type="number"
            placeholder="Cost (Cr)"
            value={form.Cost}
            onChange={createInputHandler("Cost")}
          />
          <FormField
            placeholder="Notes"
            value={form.Notes}
            onChange={createInputHandler("Notes")}
          />
        </div>
        <button
          className="btn mt-2"
          onClick={handleSubmit}
          type="button"
          data-testid="add-armour-button"
          aria-label="Add new armour entry to character equipment"
        >
          Add Armour
        </button>
      </SectionCard>

      <Table
        columns={["Armour", "Type", "Protection", "Mass", "Cost", "Notes"]}
        rows={rows}
      />
    </div>
  );
}
