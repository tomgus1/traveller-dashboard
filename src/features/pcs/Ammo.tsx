import SectionCard from "../../components/SectionCard";
import Table from "../../components/Table";
import FormField from "../../components/FormField";
import Tooltip from "../../components/Tooltip";
import { useForm } from "../../hooks/useForm";
import type { AmmoRow, WeaponRow } from "../../types";

type AmmoFormData = Record<string, string> & {
  Weapon: string;
  "Ammo Type": string;
  "Magazine Size": string;
  "Rounds Loaded": string;
  "Spare Magazines": string;
  "Loose Rounds": string;
  Notes: string;
};

const INITIAL_FORM: AmmoFormData = {
  Weapon: "",
  "Ammo Type": "",
  "Magazine Size": "",
  "Rounds Loaded": "",
  "Spare Magazines": "",
  "Loose Rounds": "",
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
      <button
        className="btn-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
        onClick={() => onFireRound?.(index)}
        disabled={Number(row["Total Rounds"] || 0) <= 0}
        title={`Fire one round from ${row.Weapon}`}
        aria-label={`Fire one round from ${row.Weapon}`}
      >
        Fire
      </button>
      <button
        className="btn-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
        onClick={() => onReload?.(index)}
        disabled={
          Number(row["Spare Magazines"] || 0) <= 0 &&
          Number(row["Loose Rounds"] || 0) <= 0
        }
        title={`Reload ${row.Weapon}`}
        aria-label={`Reload ${row.Weapon}`}
      >
        Reload
      </button>
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function
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
  const { form, createInputHandler, resetForm, updateField } =
    useForm(INITIAL_FORM);

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
        <div className="grid md:grid-cols-3 gap-3">
          <FormField
            type="select"
            value={form.Weapon === "__custom" ? "" : form.Weapon}
            onChange={createInputHandler("Weapon")}
          >
            <option value="">Select Weapon</option>
            {weapons.map((weapon) => (
              <option key={weapon.Weapon} value={weapon.Weapon}>
                {weapon.Weapon} ({weapon.Type})
              </option>
            ))}
            <option value="__custom">--- Custom Weapon ---</option>
          </FormField>
          {form.Weapon === "__custom" && (
            <FormField
              placeholder="Custom Weapon Name"
              value=""
              onChange={(e) => handleCustomWeapon(e.target.value)}
            />
          )}
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
            placeholder="Notes"
            value={form.Notes}
            onChange={createInputHandler("Notes")}
          />
        </div>
        <button
          className="btn mt-2"
          onClick={handleSubmit}
          type="button"
          data-testid="add-ammo-button"
          aria-label="Add new ammunition entry to character equipment"
        >
          Add Ammunition
        </button>
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
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
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
