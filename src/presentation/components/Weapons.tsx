import SectionCard from "./SectionCard";
import Table from "./Table";
import FormField from "./FormField";
import { Button } from "./Button";
import { useForm } from "../hooks/useForm";
import type { WeaponRow } from "../../types";

type WeaponFormData = Record<string, string> & {
  Weapon: string;
  Type: string;
  Damage: string;
  Range: string;
  Mass: string;
  Cost: string;
  Notes: string;
};

const INITIAL_FORM: WeaponFormData = {
  Weapon: "",
  Type: "",
  Damage: "",
  Range: "",
  Mass: "",
  Cost: "",
  Notes: "",
};

export default function Weapons({
  rows,
  onAdd,
}: {
  rows: WeaponRow[];
  onAdd: (r: WeaponRow) => void;
}) {
  const { form, createInputHandler, resetForm } = useForm(INITIAL_FORM);

  const handleSubmit = () => {
    if (!form.Weapon) return;

    onAdd({
      Weapon: form.Weapon as string,
      Type: form.Type as string,
      Damage: form.Damage as string,
      Range: form.Range as string,
      Mass: form.Mass ? Number(form.Mass) : undefined,
      Cost: form.Cost ? Number(form.Cost) : undefined,
      Notes: form.Notes as string,
    });

    resetForm();
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Add Weapon Entry">
        <div className="grid md:grid-cols-3 gap-3">
          <FormField
            placeholder="Weapon Name"
            value={form.Weapon}
            onChange={createInputHandler("Weapon")}
          />
          <FormField
            type="select"
            value={form.Type}
            onChange={createInputHandler("Type")}
          >
            <option value="">Select Type</option>
            <option value="Melee">Melee</option>
            <option value="Pistol">Pistol</option>
            <option value="Rifle">Rifle</option>
            <option value="Shotgun">Shotgun</option>
            <option value="Heavy Weapon">Heavy Weapon</option>
            <option value="Explosive">Explosive</option>
            <option value="Other">Other</option>
          </FormField>
          <FormField
            placeholder="Damage (e.g., 3d6)"
            value={form.Damage}
            onChange={createInputHandler("Damage")}
          />
          <FormField
            placeholder="Range (e.g., 150m)"
            value={form.Range}
            onChange={createInputHandler("Range")}
          />
          <FormField
            type="number"
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
        <Button
          className="mt-2"
          onClick={handleSubmit}
          type="button"
          data-testid="add-weapon-button"
          aria-label="Add new weapon entry to character equipment"
        >
          Add Weapon
        </Button>
      </SectionCard>

      <Table
        columns={["Weapon", "Type", "Damage", "Range", "Mass", "Cost", "Notes"]}
        rows={rows}
      />
    </div>
  );
}
