import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppState } from "../hooks/useAppState";
import { useCampaignData } from "../hooks/useCampaignData";
import { useBalanceCalculations } from "../hooks/useBalanceCalculations";
import { useImportExport } from "../hooks/useImportExport";
import { useCampaignCharacters } from "../hooks/useCampaignCharacters";
import AppHeader from "./AppHeader";
import StatsDashboard from "./StatsDashboard";
import { TabsBar } from "./Tabs";
import TabContent from "./TabContent";

export default function Dashboard() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"party" | "ship" | "cargo" | "characters">(
    "party"
  );

  // Get characters for this campaign (pass empty string if no campaignId)
  const { characters } = useCampaignCharacters(campaignId || "");

  // Use character display name as selected character (simpler than ID)
  const [selectedCharacter, setSelectedCharacter] = useState<string>("");

  // Auto-select first character if none selected
  const actualSelectedCharacter =
    selectedCharacter || characters[0]?.displayName || "";

  // Campaign-level data (Party/Ship finances, Cargo, etc.) - now from database!
  const {
    partyFinances,
    shipFinances,
    shipCargo,
    shipMaintenance,
    loans,
    partyInventory,
    campaignAmmo,
    updatePartyFinances,
    updateShipAccounts,
    addCargoLeg,
  } = useCampaignData(campaignId);

  // Character-level data (still using localStorage for now)
  const {
    state,
    setState,
    updateCharacterFinance,
    addCharacterInventory,
    addCharacterAmmo,
    addCharacterWeapon,
    addCharacterArmour,
    fireRound,
    reloadWeapon,
  } = useAppState();

    const balances = useBalanceCalculations({
    Party_Finances: partyFinances,
    Ship_Accounts: shipFinances,
    Ship_Cargo: shipCargo,
    Ship_Maintenance_Log: shipMaintenance,
    Loans_Mortgage: loans,
    Party_Inventory: partyInventory,
    Ammo_Tracker: campaignAmmo,
    PCs: state.PCs,
  }, actualSelectedCharacter);
  const { handleImport, handleExport } = useImportExport(setState, state);

  // Handle missing campaignId after all hooks are called
  if (!campaignId) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      {/* Header with Back Button */}
      <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
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
          cargoLegsCount={shipCargo.length}
          characterCount={characters.length}
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
          campaignId={campaignId || ''}
          activeTab={tab}
          partyFinances={partyFinances}
          shipFinances={shipFinances}
          shipCargo={shipCargo}
          state={state}
          selectedCharacterDisplayName={actualSelectedCharacter}
          characterBalance={balances.character}
          onCharacterChange={setSelectedCharacter}
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
