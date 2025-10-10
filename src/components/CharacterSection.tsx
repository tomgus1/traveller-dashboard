import { useState } from "react";
import { PC_NAMES } from "../constants";
import { fmtCr } from "../utils/number";
import { TabsBar } from "../components/Tabs";
import Characters from "../features/pcs/Characters";
import Inventory from "../features/pcs/Inventory";
import Ammo from "../features/pcs/Ammo";
import Weapons from "../features/pcs/Weapons";
import Armour from "../features/pcs/Armour";
import type {
  FinanceRow,
  InventoryRow,
  AmmoRow,
  WeaponRow,
  ArmourRow,
} from "../types";

interface CharacterSectionProps {
  selectedPc: string;
  onPcChange: (pc: string) => void;
  characterBalance: number;
  characterFinance: FinanceRow[];
  characterInventory: InventoryRow[];
  characterAmmo: AmmoRow[];
  characterWeapons: WeaponRow[];
  characterArmour: ArmourRow[];
  onUpdateFinance: (pc: string, rows: FinanceRow[]) => void;
  onAddInventory: (pc: string, item: InventoryRow) => void;
  onAddAmmo: (pc: string, ammo: AmmoRow) => void;
  onAddWeapon: (pc: string, weapon: WeaponRow) => void;
  onAddArmour: (pc: string, armour: ArmourRow) => void;
}

/**
 * Character management section component
 * Extracted from App.tsx to follow Single Responsibility Principle
 * Handles all character-related UI and state management
 */
export default function CharacterSection({
  selectedPc,
  onPcChange,
  characterBalance,
  characterFinance,
  characterInventory,
  characterAmmo,
  characterWeapons,
  characterArmour,
  onUpdateFinance,
  onAddInventory,
  onAddAmmo,
  onAddWeapon,
  onAddArmour,
}: CharacterSectionProps) {
  const [charTab, setCharTab] = useState<
    "ledger" | "inventory" | "weapons" | "armour" | "ammo"
  >("ledger");

  return (
    <div className="space-y-4">
      {/* Character Selection and Balance */}
      <div className="flex items-center gap-3">
        <select
          className="select"
          value={selectedPc}
          onChange={(e) => onPcChange(e.target.value)}
          data-testid="character-select"
          aria-label="Select character to view and manage"
        >
          {PC_NAMES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <div className="text-sm">
          <span
            aria-label={`Current character balance: ${fmtCr(characterBalance)}`}
          >
            Balance:{" "}
            <span className="font-semibold">{fmtCr(characterBalance)}</span>
          </span>
        </div>
      </div>

      {/* Character Tab Navigation */}
      <TabsBar
        tabs={[
          { id: "ledger", label: "Ledger" },
          { id: "inventory", label: "Inventory" },
          { id: "weapons", label: "Weapons" },
          { id: "armour", label: "Armour" },
          { id: "ammo", label: "Ammo" },
        ]}
        active={charTab}
        onChange={(id) =>
          setCharTab(
            id as "ledger" | "inventory" | "weapons" | "armour" | "ammo"
          )
        }
      />

      {/* Character Tab Content */}
      {charTab === "ledger" && (
        <Characters
          pcNames={[...PC_NAMES]}
          pc={selectedPc}
          onPcChange={onPcChange}
          rows={characterFinance}
          balance={characterBalance}
          onAdd={(rows) => onUpdateFinance(selectedPc, rows)}
        />
      )}

      {charTab === "inventory" && (
        <Inventory
          rows={characterInventory}
          onAdd={(item) => onAddInventory(selectedPc, item)}
        />
      )}

      {charTab === "weapons" && (
        <Weapons
          rows={characterWeapons}
          onAdd={(weapon) => onAddWeapon(selectedPc, weapon)}
        />
      )}

      {charTab === "armour" && (
        <Armour
          rows={characterArmour}
          onAdd={(armour) => onAddArmour(selectedPc, armour)}
        />
      )}

      {charTab === "ammo" && (
        <Ammo
          rows={characterAmmo}
          onAdd={(ammo) => onAddAmmo(selectedPc, ammo)}
        />
      )}
    </div>
  );
}
