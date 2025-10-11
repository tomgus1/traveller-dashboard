import { useState } from "react";
import { useAppState } from "../hooks/useAppState";
import { useBalanceCalculations } from "../hooks/useBalanceCalculations";
import { useImportExport } from "../hooks/useImportExport";
import AppHeader from "./AppHeader";
import StatsDashboard from "./StatsDashboard";
import { TabsBar } from "./Tabs";
import TabContent from "./TabContent";

interface DashboardProps {
  campaignId: string;
  onBackToCampaigns: () => void;
}

export default function Dashboard({ campaignId, onBackToCampaigns }: DashboardProps) {
  const [tab, setTab] = useState<"party" | "ship" | "cargo" | "characters">("party");
  const [pc, setPc] = useState("");

  const {
    state,
    setState,
    updatePartyFinances,
    updateShipAccounts,
    addCargoLeg,
    updateCharacterFinance,
    addCharacterInventory,
    addCharacterAmmo,
    addCharacterWeapon,
    addCharacterArmour,
    fireRound,
    reloadWeapon,
  } = useAppState();

  const balances = useBalanceCalculations(state, pc);
  const { handleImport, handleExport } = useImportExport(setState, state);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Back Button */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToCampaigns}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors border border-gray-300 rounded-md hover:border-gray-400"
            >
              ← Back to Campaigns
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Campaign Dashboard</h1>
              <p className="text-sm text-gray-600">Campaign ID: {campaignId}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <AppHeader onImport={handleImport} onExport={handleExport} />

        <StatsDashboard
          partyBalance={balances.party}
          shipBalance={balances.ship}
          cargoLegsCount={state.Ship_Cargo.length}
        />

        <TabsBar
          tabs={[
            { id: "party", label: "Party" },
            { id: "ship", label: "Ship" },
            { id: "cargo", label: "Cargo" },
            { id: "characters", label: "Characters" },
          ]}
          active={tab}
          onChange={(id: string) => setTab(id as "party" | "ship" | "cargo" | "characters")}
        />

        <TabContent
          activeTab={tab}
          state={state}
          selectedPc={pc}
          characterBalance={balances.character}
          onPcChange={setPc}
          onUpdatePartyFinances={updatePartyFinances}
          onUpdateShipAccounts={updateShipAccounts}
          onAddCargoLeg={addCargoLeg}
          onUpdateCharacterFinance={updateCharacterFinance}
          onAddCharacterInventory={addCharacterInventory}
          onAddCharacterAmmo={addCharacterAmmo}
          onAddCharacterWeapon={addCharacterWeapon}
          onAddCharacterArmour={addCharacterArmour}
          onFireRound={fireRound}
          onReloadWeapon={reloadWeapon}
        />
      </div>
    </div>
  );
}