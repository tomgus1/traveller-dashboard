import { useState } from "react";
import { useAppState } from "../hooks/useAppState";
import { useBalanceCalculations } from "../hooks/useBalanceCalculations";
import { useImportExport } from "../hooks/useImportExport";
import { PC_NAMES } from "../constants";
import AppHeader from "./AppHeader";
import StatsDashboard from "./StatsDashboard";
import { TabsBar } from "./Tabs";
import TabContent from "./TabContent";

interface DashboardProps {
  campaignId: string;
  onBackToCampaigns: () => void;
}

export default function Dashboard({
  campaignId,
  onBackToCampaigns,
}: DashboardProps) {
  const [tab, setTab] = useState<"party" | "ship" | "cargo" | "characters">(
    "party"
  );
  const [pc, setPc] = useState<string>(PC_NAMES[0]);

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
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      {/* Header with Back Button */}
      <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToCampaigns}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors border border-gray-300 dark:border-zinc-600 rounded-md hover:border-gray-400 dark:hover:border-zinc-500"
            >
              ← Back to Campaigns
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-50">
                Campaign Dashboard
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Campaign ID: {campaignId}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
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
          onChange={(id: string) =>
            setTab(id as "party" | "ship" | "cargo" | "characters")
          }
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
