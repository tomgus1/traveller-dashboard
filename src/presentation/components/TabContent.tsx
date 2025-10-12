import type {
  CampaignState,
  FinanceRow,
  CargoRow,
  InventoryRow,
  AmmoRow,
  WeaponRow,
  ArmourRow,
} from "../../types";
import Cargo from "./Cargo";
import FinanceManager from "./FinanceManager";
import CharacterSection from "./CharacterSection";

interface TabContentProps {
  campaignId: string; // Add campaign context
  activeTab: "party" | "ship" | "cargo" | "characters";
  state: CampaignState;
  selectedCharacterId: string;
  characterBalance: number;
  onCharacterChange: (characterDisplayName: string) => void;
  onUpdatePartyFinances: (rows: FinanceRow[]) => void;
  onUpdateShipAccounts: (rows: FinanceRow[]) => void;
  onAddCargoLeg: (row: CargoRow) => void;
  onUpdateCharacterFinance: (
    characterDisplayName: string,
    rows: FinanceRow[]
  ) => void;
  onAddCharacterInventory: (
    characterDisplayName: string,
    item: InventoryRow
  ) => void;
  onAddCharacterAmmo: (characterDisplayName: string, ammo: AmmoRow) => void;
  onAddCharacterWeapon: (
    characterDisplayName: string,
    weapon: WeaponRow
  ) => void;
  onAddCharacterArmour: (
    characterDisplayName: string,
    armour: ArmourRow
  ) => void;
  onFireRound: (characterDisplayName: string, ammoIndex: number) => void;
  onReloadWeapon: (characterDisplayName: string, ammoIndex: number) => void;
}

export default function TabContent({
  campaignId,
  activeTab,
  state,
  selectedCharacterId,
  characterBalance,
  onCharacterChange,
  onUpdatePartyFinances,
  onUpdateShipAccounts,
  onAddCargoLeg,
  onUpdateCharacterFinance,
  onAddCharacterInventory,
  onAddCharacterAmmo,
  onAddCharacterWeapon,
  onAddCharacterArmour,
  onFireRound,
  onReloadWeapon,
}: TabContentProps) {
  return (
    <div
      role="tabpanel"
      aria-labelledby={`tab-${activeTab}`}
      id={`tabpanel-${activeTab}`}
    >
      {activeTab === "party" && (
        <FinanceManager
          title="Party"
          rows={state.Party_Finances}
          onUpdate={onUpdatePartyFinances}
          fundName="Party Fund"
          initialBalance={0}
          showSummary={true}
        />
      )}

      {activeTab === "ship" && (
        <FinanceManager
          title="Ship"
          rows={state.Ship_Accounts}
          onUpdate={onUpdateShipAccounts}
          fundName="Ship Fund"
          initialBalance={0}
          showSummary={true}
        />
      )}

      {activeTab === "cargo" && (
        <Cargo rows={state.Ship_Cargo} onAdd={onAddCargoLeg} />
      )}

      {activeTab === "characters" && (
        <CharacterSection
          campaignId={campaignId}
          selectedPc={selectedCharacterId}
          onPcChange={onCharacterChange}
          characterBalance={characterBalance}
          characterFinance={state.PCs[selectedCharacterId]?.Finance || []}
          characterInventory={state.PCs[selectedCharacterId]?.Inventory || []}
          characterAmmo={state.PCs[selectedCharacterId]?.Ammo || []}
          characterWeapons={state.PCs[selectedCharacterId]?.Weapons || []}
          characterArmour={state.PCs[selectedCharacterId]?.Armour || []}
          onUpdateFinance={onUpdateCharacterFinance}
          onAddInventory={onAddCharacterInventory}
          onAddAmmo={onAddCharacterAmmo}
          onAddWeapon={onAddCharacterWeapon}
          onAddArmour={onAddCharacterArmour}
          onFireRound={onFireRound}
          onReloadWeapon={onReloadWeapon}
        />
      )}
    </div>
  );
}
