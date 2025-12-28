import Table from "./Table";
import FormField from "./FormField";
import { useForm } from "../hooks/useForm";
import { useTravellerWeapons } from "../../hooks/useTravellerWeapons";
import { Info, Plus, Target, Zap } from "lucide-react";
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
  const isOutOfAmmo = Number(row["Total Rounds"] || 0) <= 0;
  const canReload = Number(row["Spare Magazines"] || 0) > 0 || Number(row["Loose Rounds"] || 0) > 0;

  return (
    <div className="flex gap-2">
      <button
        onClick={() => onFireRound?.(index)}
        disabled={isOutOfAmmo}
        className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${isOutOfAmmo
            ? 'bg-white/5 text-muted opacity-50 cursor-not-allowed'
            : 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white shadow-lg shadow-red-500/10'
          }`}
      >
        Fire
      </button>
      <button
        onClick={() => onReload?.(index)}
        disabled={!canReload}
        className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${!canReload
            ? 'bg-white/5 text-muted opacity-50 cursor-not-allowed'
            : 'bg-primary/10 text-primary hover:bg-primary hover:text-white shadow-lg shadow-primary-glow'
          }`}
      >
        Reload
      </button>
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

    const weapon = getWeaponByName(weaponName);
    if (weapon && weapon.magazine !== null) {
      setForm({
        ...form,
        Weapon: weapon.name,
        "Magazine Size": weapon.magazine.toString(),
        "Ammo Type": weapon.type,
      });
    } else {
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

  const enhancedRows = rows.map((row, index) => ({
    ...row,
    Weapon: <span className="font-black text-primary uppercase tracking-tight">{row.Weapon}</span>,
    "Ammo Type": <span className="text-muted font-bold tracking-widest text-[10px] uppercase px-2 py-0.5 bg-white/5 rounded-full border border-white/5">{row["Ammo Type"]}</span>,
    "Rounds Loaded": (
      <div className="flex items-center gap-2">
        <Zap className={`w-3 h-3 ${Number(row["Rounds Loaded"]) > 0 ? 'text-amber-400' : 'text-red-500'}`} />
        <span className="font-mono font-bold">{row["Rounds Loaded"]}</span>
      </div>
    ),
    "Total Rounds": <span className="font-black text-primary">{row["Total Rounds"]}</span>,
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
    <div className="space-y-6">
      <div className="hud-glass p-6">
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-black tracking-[0.2em] uppercase text-text-main">
            Ballistics <span className="text-primary">Registry</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <FormField
            type="select"
            label="Designation Target"
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
            <option value="">Select Ordinance Target...</option>
            <optgroup label="Active Loadout">
              {weapons.map((weapon) => (
                <option key={weapon.Weapon} value={weapon.Weapon}>
                  {weapon.Weapon}
                </option>
              ))}
            </optgroup>
            <optgroup label="Ordinance Database">
              {getAllWeapons()
                .filter((w) => w.magazine !== null)
                .map((weapon) => (
                  <option key={weapon.name} value={weapon.name}>
                    {weapon.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Manual Override">
              <option value="__custom">Custom Ordinance Target</option>
            </optgroup>
          </FormField>

          <FormField
            label="Payload Type"
            placeholder="e.g., AP, HE, 9mm"
            value={form["Ammo Type"]}
            onChange={createInputHandler("Ammo Type")}
          />
        </div>

        {form.Weapon === "__custom" && (
          <div className="mb-4 animate-in">
            <FormField
              label="Manual Designation"
              placeholder="Enter Custom Ordinance Name..."
              value=""
              onChange={(e) => handleCustomWeapon(e.target.value)}
            />
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-white/5">
          <FormField
            type="number"
            placeholder="MAG SZ"
            value={form["Magazine Size"]}
            onChange={createInputHandler("Magazine Size")}
          />
          <FormField
            type="number"
            placeholder="LOADED"
            value={form["Rounds Loaded"]}
            onChange={createInputHandler("Rounds Loaded")}
          />
          <FormField
            type="number"
            placeholder="SPARE MAGS"
            value={form["Spare Magazines"]}
            onChange={createInputHandler("Spare Magazines")}
          />
          <FormField
            type="number"
            placeholder="LOOSE"
            value={form["Loose Rounds"]}
            onChange={createInputHandler("Loose Rounds")}
          />
          <FormField
            type="number"
            placeholder="COST"
            value={form.Cost}
            onChange={createInputHandler("Cost")}
          />
          <button
            onClick={handleSubmit}
            className="btn-hud py-2.5 flex items-center justify-center gap-2 group"
            type="button"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Deploy</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 mb-6">
        <Info className="w-4 h-4 text-primary" />
        <p className="text-[10px] font-bold text-muted uppercase tracking-wider">
          Priority System: Loaded Rounds <span className="text-primary">→</span> Spare Mags <span className="text-primary">→</span> Loose Rounds
        </p>
      </div>

      <div className="hud-glass p-0 overflow-hidden">
        <Table
          columns={[
            "Weapon",
            "Ammo Type",
            "Magazine Size",
            "Rounds Loaded",
            "Spare Magazines",
            "Loose Rounds",
            "Total Rounds",
            "Actions",
          ]}
          rows={enhancedRows}
        />
      </div>
    </div>
  );
}
