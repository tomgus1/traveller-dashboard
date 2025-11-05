import SectionCard from "./SectionCard";
import Table from "./Table";
import FormField from "./FormField";
import { Button } from "./Button";
import { useForm } from "../hooks/useForm";
import { useTravellerWeapons } from "../../hooks/useTravellerWeapons";
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
  const { form, createInputHandler, resetForm, setForm } =
    useForm(INITIAL_FORM);
  const { getAllWeapons, getWeaponTypes, getWeaponByName } =
    useTravellerWeapons();

  const handleWeaponSelect = (weaponName: string) => {
    if (!weaponName || weaponName === "") {
      resetForm();
      return;
    }

    const weapon = getWeaponByName(weaponName);
    if (weapon) {
      // Format range: if range_long exists, show "range - range_long", otherwise just range
      const rangeDisplay = weapon.range_long
        ? `${weapon.range} - ${weapon.range_long}`
        : weapon.range;

      setForm({
        Weapon: weapon.name,
        Type: weapon.type,
        Damage: weapon.damage,
        Range: rangeDisplay,
        Mass: weapon.mass.toString(),
        Cost: weapon.cost.toString(),
        Notes: weapon.notes,
      });
    }
  };

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
        <div className="space-y-3">
          <FormField
            type="select"
            value={form.Weapon === "custom" ? "custom" : form.Weapon}
            onChange={(e) => {
              if (e.target.value === "custom") {
                setForm({ ...INITIAL_FORM, Weapon: "custom" });
              } else {
                createInputHandler("Weapon")(e);
                handleWeaponSelect(e.target.value);
              }
            }}
          >
            <option value="">Select from Database or Enter Custom</option>
            <optgroup label="Traveller Weapons Database">
              {getAllWeapons().map((weapon) => (
                <option key={weapon.name} value={weapon.name}>
                  {weapon.name} ({weapon.type}) - {weapon.cost} Cr
                </option>
              ))}
            </optgroup>
            <optgroup label="Custom">
              <option value="custom">Enter Custom Weapon</option>
            </optgroup>
          </FormField>

          {form.Weapon === "custom" && (
            <FormField
              placeholder="Custom Weapon Name"
              value=""
              onChange={(e) => {
                setForm({ ...form, Weapon: e.target.value });
              }}
            />
          )}

          <div className="grid md:grid-cols-3 gap-3">
            <FormField
              type="select"
              value={form.Type}
              onChange={createInputHandler("Type")}
            >
              <option value="">Select Type</option>
              {getWeaponTypes().map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
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
        rows={rows.map((row) => ({
          ...row,
          Range: row.Range ? `${row.Range}` : "",
          Mass: row.Mass ? `${row.Mass} kg` : "",
        }))}
      />
    </div>
  );
}
