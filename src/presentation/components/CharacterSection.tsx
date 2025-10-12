import { useState } from "react";
import { fmtCr } from "../../shared/utils/number";
import { TabsBar } from "../components/Tabs";
import { useCampaignCharacters } from "../hooks/useCampaignCharacters";
import Characters from "./Characters";
import Inventory from "./Inventory";
import Ammo from "./Ammo";
import Weapons from "./Weapons";
import Armour from "./Armour";
import type {
  FinanceRow,
  InventoryRow,
  AmmoRow,
  WeaponRow,
  ArmourRow,
} from "../../types";

interface CharacterSectionProps {
  campaignId?: string; // Campaign context for character loading
  selectedPc: string; // Display name of selected character
  onPcChange: (displayName: string) => void;
  characterBalance: number;
  characterFinance: FinanceRow[];
  characterInventory: InventoryRow[];
  characterAmmo: AmmoRow[];
  characterWeapons: WeaponRow[];
  characterArmour: ArmourRow[];
  onUpdateFinance: (displayName: string, rows: FinanceRow[]) => void;
  onAddInventory: (displayName: string, item: InventoryRow) => void;
  onAddAmmo: (displayName: string, ammo: AmmoRow) => void;
  onAddWeapon: (displayName: string, weapon: WeaponRow) => void;
  onAddArmour: (displayName: string, armour: ArmourRow) => void;
  onFireRound?: (displayName: string, ammoIndex: number) => void;
  onReloadWeapon?: (displayName: string, ammoIndex: number) => void;
}

/**
 * Character management section component
 * Now uses database-driven character management with fallback to legacy system
 * Handles all character-related UI and state management
 */
export default function CharacterSection({
  campaignId,
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
  onFireRound,
  onReloadWeapon,
}: CharacterSectionProps) {
  const [charTab, setCharTab] = useState<
    "ledger" | "inventory" | "weapons" | "armour" | "ammo"
  >("ledger");

  // Load characters for the current campaign
  const { characters, loading, error } = useCampaignCharacters(campaignId);

  // Find the currently selected character
  const selectedCharacter = characters.find(
    (char) => char.displayName === selectedPc
  );

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
          disabled={loading}
        >
          {loading ? (
            <option>Loading characters...</option>
          ) : (
            characters.map((character) => (
              <option key={character.id} value={character.displayName}>
                {character.displayName}
              </option>
            ))
          )}
        </select>

        {error && (
          <span className="text-xs text-yellow-600" title={error}>
            ⚠️ Offline mode
          </span>
        )}

        <div className="text-sm">
          <span
            aria-label={`Current character balance: ${fmtCr(characterBalance)}`}
          >
            Current Balance:{" "}
            <span className="font-semibold">{fmtCr(characterBalance)}</span>
          </span>
        </div>
      </div>

      {/* Show character info if we have database character */}
      {selectedCharacter && selectedCharacter.id.startsWith("character-") && (
        <div className="text-xs text-gray-600">
          Player: {selectedCharacter.playerName} | Character:{" "}
          {selectedCharacter.characterName}
        </div>
      )}

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
          pc={selectedPc}
          rows={characterFinance}
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
          weapons={characterWeapons}
          onAdd={(ammo) => onAddAmmo(selectedPc, ammo)}
          onFireRound={(ammoIndex) => onFireRound?.(selectedPc, ammoIndex)}
          onReload={(ammoIndex) => onReloadWeapon?.(selectedPc, ammoIndex)}
        />
      )}
    </div>
  );
}
