import type {
  CampaignState,
  FinanceRow,
  CargoRow,
  InventoryRow,
  AmmoRow,
} from "../types";
import Cargo from "../features/cargo/Cargo";
import FinanceManager from "./FinanceManager";
import CharacterSection from "./CharacterSection";

interface TabContentProps {
  activeTab: "party" | "ship" | "cargo" | "characters";
  state: CampaignState;
  selectedPc: string;
  characterBalance: number;
  onPcChange: (pc: string) => void;
  onUpdatePartyFinances: (rows: FinanceRow[]) => void;
  onUpdateShipAccounts: (rows: FinanceRow[]) => void;
  onAddCargoLeg: (row: CargoRow) => void;
  onUpdateCharacterFinance: (pc: string, rows: FinanceRow[]) => void;
  onAddCharacterInventory: (pc: string, item: InventoryRow) => void;
  onAddCharacterAmmo: (pc: string, ammo: AmmoRow) => void;
}

export default function TabContent({
  activeTab,
  state,
  selectedPc,
  characterBalance,
  onPcChange,
  onUpdatePartyFinances,
  onUpdateShipAccounts,
  onAddCargoLeg,
  onUpdateCharacterFinance,
  onAddCharacterInventory,
  onAddCharacterAmmo,
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
          selectedPc={selectedPc}
          onPcChange={onPcChange}
          characterBalance={characterBalance}
          characterFinance={state.PCs[selectedPc].Finance}
          characterInventory={state.PCs[selectedPc].Inventory}
          characterAmmo={state.PCs[selectedPc].Ammo || []}
          onUpdateFinance={onUpdateCharacterFinance}
          onAddInventory={onAddCharacterInventory}
          onAddAmmo={onAddCharacterAmmo}
        />
      )}
    </div>
  );
}
