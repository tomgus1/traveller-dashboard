import Table from "./Table";
import FormField from "./FormField";
import { useForm } from "../hooks/useForm";
import { useTravellerWeapons } from "../../hooks/useTravellerWeapons";
import type { WeaponRow } from "../../types";
import { useState } from "react";
import { Crosshair, Plus } from "lucide-react";
import type { WeaponSource } from "../../data/traveller-weapons.types";

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
  const [sourceFilter, setSourceFilter] = useState<WeaponSource | "All">("All");

  const handleWeaponSelect = (weaponName: string) => {
    if (!weaponName || weaponName === "") {
      resetForm();
      return;
    }

    const weapon = getWeaponByName(weaponName);
    if (weapon) {
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
    <div className="space-y-6">
      <div className="hud-glass p-6">
        <div className="flex items-center gap-3 mb-6">
          <Crosshair className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-black tracking-[0.2em] uppercase text-text-main">
            Armory <span className="text-primary">Inventory</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <FormField
            type="select"
            label="Database Source"
            value={sourceFilter}
            onChange={(e) =>
              setSourceFilter(e.target.value as WeaponSource | "All")
            }
          >
            <option value="All">All Mission Datasheets</option>
            <option value="Core Rulebook">Core Rulebook</option>
            <option value="High Guard">High Guard</option>
            <option value="Central Supply Catalogue">Central Supply Catalogue</option>
            <option value="Mercenary">Mercenary</option>
            <option value="Other">Other</option>
          </FormField>

          <FormField
            type="select"
            label="Registry"
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
            <option value="">Select Ordinance...</option>
            <optgroup label="Ordinance Database">
              {getAllWeapons()
                .filter(
                  (weapon) =>
                    sourceFilter === "All" || weapon.source === sourceFilter
                )
                .map((weapon) => (
                  <option key={weapon.name} value={weapon.name}>
                    {weapon.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Custom Registry">
              <option value="custom">Register Custom Ordinance</option>
            </optgroup>
          </FormField>
        </div>

        {form.Weapon === "custom" && (
          <div className="mb-4 animate-in">
            <FormField
              label="Custom Designation"
              placeholder="Enter Custom Weapon Name..."
              value=""
              onChange={(e) => {
                setForm({ ...form, Weapon: e.target.value });
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-white/5">
          <FormField
            type="select"
            value={form.Type}
            onChange={createInputHandler("Type")}
          >
            <option value="">Class</option>
            {getWeaponTypes().map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </FormField>
          <FormField
            placeholder="DMG"
            value={form.Damage}
            onChange={createInputHandler("Damage")}
          />
          <FormField
            placeholder="RNG"
            value={form.Range}
            onChange={createInputHandler("Range")}
          />
          <FormField
            type="number"
            placeholder="WT (kg)"
            value={form.Mass}
            onChange={createInputHandler("Mass")}
          />
          <FormField
            type="number"
            placeholder="CR"
            value={form.Cost}
            onChange={createInputHandler("Cost")}
          />
          <button
            onClick={handleSubmit}
            className="btn-hud py-2.5 flex items-center justify-center gap-2 group"
            type="button"
            data-testid="add-weapon-button"
            aria-label="Add new weapon entry to character equipment"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Equip</span>
          </button>
        </div>
      </div>

      <div className="hud-glass p-0 overflow-hidden">
        <Table
          columns={["Weapon", "Type", "Damage", "Range", "Mass", "Cost", "Notes"]}
          rows={rows.map((row) => ({
            ...row,
            Weapon: <span className="font-black text-primary uppercase tracking-tight">{row.Weapon}</span>,
            Damage: <span className="text-red-400 font-bold">{row.Damage}</span>,
            Range: row.Range ? `${row.Range}` : "N/A",
            Mass: row.Mass ? `${row.Mass} kg` : "0 kg",
          }))}
        />
      </div>
    </div>
  );
}
