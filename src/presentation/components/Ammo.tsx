import SectionCard from "./SectionCard";
import Table from "./Table";
import FormField from "./FormField";
import Tooltip from "./Tooltip";
import { Button } from "./Button";
import { useForm } from "../hooks/useForm";
import { useTravellerWeapons } from "../../hooks/useTravellerWeapons";
import { HelpCircle } from "lucide-react";
import type { AmmoRow, WeaponRow } from "../../types";

type AmmoFormData = Record<string, string> & {
  Weapon: string;
  "Ammo Type": string;
  "Magazine Size": string;
  "Rounds Loaded": string;
  "Spare Magazines": string;
  "Loose Rounds": string;
  Cost: string;
  Notes: string;
};

const INITIAL_FORM: AmmoFormData = {
  Weapon: "",
  "Ammo Type": "",
  "Magazine Size": "",
  "Rounds Loaded": "",
  "Spare Magazines": "",
  "Loose Rounds": "",
  Cost: "",
  Notes: "",
};

// Component for ammunition action buttons
function AmmoActions({
  row,
  index,
  onFireRound,
  onReload,
}: {
  row: AmmoRow;
  index: number;
  onFireRound?: (index: number) => void;
  onReload?: (index: number) => void;
}) {
  return (
    <div className="flex gap-2">
      <Button
        variant="danger"
        size="sm"
        onClick={() => onFireRound?.(index)}
        disabled={Number(row["Total Rounds"] || 0) <= 0}
        title={`Fire one round from ${row.Weapon}`}
        aria-label={`Fire one round from ${row.Weapon}`}
      >
        Fire
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={() => onReload?.(index)}
        disabled={
          Number(row["Spare Magazines"] || 0) <= 0 &&
          Number(row["Loose Rounds"] || 0) <= 0
        }
        title={`Reload ${row.Weapon}`}
        aria-label={`Reload ${row.Weapon}`}
      >
        Reload
      </Button>
    </div>
  );
}

export default function Ammo({
  rows,
  weapons = [],
  onAdd,
  onFireRound,
  onReload,
}: {
  rows: AmmoRow[];
  weapons?: WeaponRow[];
  onAdd: (r: AmmoRow) => void;
  onFireRound?: (ammoIndex: number) => void;
  onReload?: (ammoIndex: number) => void;
}) {
  const { form, createInputHandler, resetForm, updateField, setForm } =
    useForm(INITIAL_FORM);
  const { getAllWeapons, getWeaponByName } = useTravellerWeapons();

  const handleWeaponSelect = (weaponName: string) => {
    if (!weaponName || weaponName === "" || weaponName === "__custom") {
      return;
    }

    // Check if it's from the database
    const weapon = getWeaponByName(weaponName);
    if (weapon && weapon.magazine !== null) {
      // Auto-fill magazine size from database
      setForm({
        ...form,
        Weapon: weapon.name,
        "Magazine Size": weapon.magazine.toString(),
        "Ammo Type": weapon.type,
      });
    } else {
      // It's from the character's weapon inventory
      updateField("Weapon", weaponName);
    }
  };

  const handleSubmit = () => {
    if (!form.Weapon) return;

    const magazineSize = Number(form["Magazine Size"] || 0);
    const roundsLoaded = Number(form["Rounds Loaded"] || 0);
    const spareMagazines = Number(form["Spare Magazines"] || 0);
    const looseRounds = Number(form["Loose Rounds"] || 0);
    const totalRounds =
      magazineSize * spareMagazines + roundsLoaded + looseRounds;

    onAdd({
      Weapon: form.Weapon as string,
      "Ammo Type": form["Ammo Type"] as string,
      "Magazine Size": magazineSize,
      "Rounds Loaded": roundsLoaded,
      "Spare Magazines": spareMagazines,
      "Loose Rounds": looseRounds,
      "Total Rounds": totalRounds,
      Cost: form.Cost ? Number(form.Cost) : undefined,
      Notes: form.Notes as string,
    });

    resetForm();
  };

  const handleCustomWeapon = (value: string) => {
    updateField("Weapon", value);
  };

  // Enhanced table with ammunition tracking buttons
  const enhancedRows = rows.map((row, index) => ({
    ...row,
    Actions: (
      <AmmoActions
        row={row}
        index={index}
        onFireRound={onFireRound}
        onReload={onReload}
      />
    ),
  }));

  return (
    <div className="space-y-4">
      <SectionCard title="Add Ammunition Entry">
        <div className="space-y-3">
          <FormField
            type="select"
            value={form.Weapon === "__custom" ? "__custom" : form.Weapon}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "__custom") {
                setForm({ ...INITIAL_FORM, Weapon: "__custom" });
              } else {
                createInputHandler("Weapon")(e);
                handleWeaponSelect(value);
              }
            }}
          >
            <option value="">Select Weapon</option>
            <optgroup label="Your Weapons">
              {weapons.map((weapon) => (
                <option key={weapon.Weapon} value={weapon.Weapon}>
                  {weapon.Weapon} ({weapon.Type})
                </option>
              ))}
            </optgroup>
            <optgroup label="Traveller Weapons Database">
              {getAllWeapons()
                .filter((w) => w.magazine !== null)
                .map((weapon) => (
                  <option key={weapon.name} value={weapon.name}>
                    {weapon.name} ({weapon.type}) - Mag: {weapon.magazine}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Custom">
              <option value="__custom">Enter Custom Weapon</option>
            </optgroup>
          </FormField>

          {form.Weapon === "__custom" && (
            <FormField
              placeholder="Custom Weapon Name"
              value=""
              onChange={(e) => handleCustomWeapon(e.target.value)}
            />
          )}

          <div className="grid md:grid-cols-3 gap-3">
            <FormField
              placeholder="Ammo Type (e.g., 9mm, .45 ACP)"
              value={form["Ammo Type"]}
              onChange={createInputHandler("Ammo Type")}
            />
            <FormField
              type="number"
              placeholder="Magazine Size"
              value={form["Magazine Size"]}
              onChange={createInputHandler("Magazine Size")}
            />
            <FormField
              type="number"
              placeholder="Rounds Loaded"
              value={form["Rounds Loaded"]}
              onChange={createInputHandler("Rounds Loaded")}
            />
            <FormField
              type="number"
              placeholder="Spare Magazines"
              value={form["Spare Magazines"]}
              onChange={createInputHandler("Spare Magazines")}
            />
            <FormField
              type="number"
              placeholder="Loose Rounds"
              value={form["Loose Rounds"]}
              onChange={createInputHandler("Loose Rounds")}
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
          data-testid="add-ammo-button"
          aria-label="Add new ammunition entry to character equipment"
        >
          Add Ammunition
        </Button>
      </SectionCard>

      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold">Ammunition Tracking</h3>
        <Tooltip
          content={
            <div>
              <div className="font-semibold mb-2">Ammunition Tracking</div>
              <ul className="space-y-1 text-sm">
                <li>
                  • <strong>Fire Button:</strong> Consumes one round.
                  Auto-reloads from spare magazines when current magazine is
                  empty.
                </li>
                <li>
                  • <strong>Reload Button:</strong> Manually reload from spare
                  magazines or loose rounds.
                </li>
                <li>
                  • <strong>Ammo Priority:</strong> Loaded rounds → Spare
                  magazines → Loose rounds
                </li>
                <li>
                  • <strong>Total Rounds:</strong> Automatically calculated and
                  updated after each action.
                </li>
              </ul>
            </div>
          }
          position="right"
        >
          <button className="text-gray-400 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1 transition-colors duration-200">
            <HelpCircle className="w-5 h-5" />
          </button>
        </Tooltip>
      </div>

      <Table
        columns={[
          "Weapon",
          "Ammo Type",
          "Magazine Size",
          "Rounds Loaded",
          "Spare Magazines",
          "Loose Rounds",
          "Total Rounds",
          "Notes",
          "Actions",
        ]}
        rows={enhancedRows}
      />
    </div>
  );
}
