import { useState } from "react";
import { fmtCr } from "../../shared/utils/number";
import { TabsBar } from "../components/Tabs";
import { useCampaignCharacters } from "../hooks/useCampaignCharacters";
import Characters from "./Characters";
import Inventory from "./Inventory";
import Ammo from "./Ammo";
import Weapons from "./Weapons";
import Armour from "./Armour";
import Characteristics from "./Characteristics";
import { User, CreditCard, Activity } from "lucide-react";
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
    "profile" | "ledger" | "inventory" | "weapons" | "armour" | "ammo"
  >("profile");

  const { characters, loading, error } = useCampaignCharacters(campaignId);

  const selectedCharacter = characters.find(
    (char) => char.displayName === selectedPc
  );

  return (
    <div className="space-y-8 animate-hud">
      {/* Personnel Header & Selector */}
      <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-stretch">
        <div className="hud-glass p-6 flex-grow min-w-0 w-full lg:w-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-primary/10 flex items-center justify-center text-primary shadow-inner border-2 border-primary/40">
                <User className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">PERSONNEL_FILE</span>
                  {error && <span className="text-[10px] text-accent font-bold px-1.5 py-0.5 bg-accent/10 border border-accent">OFFLINE</span>}
                </div>
                <select
                  className="bg-transparent text-2xl font-black tracking-tight border-none p-0 focus:ring-0 cursor-pointer hover:text-primary transition-colors appearance-none"
                  value={selectedPc}
                  onChange={(e) => onPcChange(e.target.value)}
                  disabled={loading}
                >
                  {loading ? (
                    <option>Loading Personnel...</option>
                  ) : (
                    characters.map((character) => (
                      <option key={character.id} value={character.displayName} className="bg-surface-high">
                        {character.displayName}
                      </option>
                    ))
                  )}
                </select>
                {selectedCharacter && (
                  <p className="text-sm text-muted uppercase tracking-widest font-bold mt-1">
                    {selectedCharacter.characterName || 'Unknown operative'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="px-5 py-3 bg-surface-low border border-border flex items-center gap-4">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-[10px] font-black text-muted uppercase tracking-widest">Available Credits</p>
                  <p className="font-bold text-text-main">{fmtCr(characterBalance)}</p>
                </div>
              </div>
              <div className="px-5 py-3 bg-surface-low border border-border flex items-center gap-4">
                <Activity className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-[10px] font-black text-muted uppercase tracking-widest">Status</p>
                  <p className="font-bold text-text-main uppercase">Mission Ready</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <TabsBar
        tabs={[
          { id: "profile", label: "Bio-Profile" },
          { id: "ledger", label: "Financial Ledger" },
          { id: "inventory", label: "Gear Manifest" },
          { id: "weapons", label: "Armory Entry" },
          { id: "armour", label: "Protection Suite" },
          { id: "ammo", label: "Ballistics Tracker" },
        ]}
        active={charTab}
        onChange={(id) =>
          setCharTab(
            id as "profile" | "ledger" | "inventory" | "weapons" | "armour" | "ammo"
          )
        }
      />

      {/* Content Area with Fade Effect */}
      <div className="transition-all duration-500">
        {charTab === "profile" && (
          <Characteristics stats={selectedCharacter?.stats} />
        )}

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
    </div>
  );
}
