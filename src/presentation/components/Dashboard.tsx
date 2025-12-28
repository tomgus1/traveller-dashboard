import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { FinanceRow, InventoryRow, AmmoRow, WeaponRow, ArmourRow } from "../../types";
import { useAppState } from "../hooks/useAppState";
import { useCampaignData } from "../hooks/useCampaignData";
import { useCharacterData } from "../hooks/useCharacterData";
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

  // Find the character ID for the selected character
  const selectedCharacterId = useMemo(() => {
    const character = characters.find(c => c.displayName === actualSelectedCharacter);
    return character?.id;
  }, [characters, actualSelectedCharacter]);

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

  // Character-level data - now from database!
  const {
    finance: characterFinance,
    inventory: characterInventory,
    weapons: characterWeapons,
    armour: characterArmour,
    ammo: characterAmmo,
    updateFinance: updateCharacterFinance,
    addInventory: addCharacterInventory,
    addAmmo: addCharacterAmmo,
    addWeapon: addCharacterWeapon,
    addArmour: addCharacterArmour,
    fireRound,
    reloadWeapon,
  } = useCharacterData(selectedCharacterId);

  // Keep useAppState for backward compatibility (import/export, legacy data)
  const { state, setState } = useAppState();

  // Build character data in the format expected by useBalanceCalculations
  const characterData = useMemo(() => {
    if (!actualSelectedCharacter) return {};

    return {
      [actualSelectedCharacter]: {
        Finance: characterFinance,
        Inventory: characterInventory,
        Weapons: characterWeapons,
        Armour: characterArmour,
        Ammo: characterAmmo,
      },
    };
  }, [actualSelectedCharacter, characterFinance, characterInventory, characterWeapons, characterArmour, characterAmmo]);

  const balances = useBalanceCalculations({
    Party_Finances: partyFinances,
    Ship_Accounts: shipFinances,
    Ship_Cargo: shipCargo,
    Ship_Maintenance_Log: shipMaintenance,
    Loans_Mortgage: loans,
    Party_Inventory: partyInventory,
    Ammo_Tracker: campaignAmmo,
    PCs: characterData,
  }, actualSelectedCharacter);
  const { handleImport, handleExport } = useImportExport(setState, state);

  // Wrapper functions to match expected callback signatures
  // (they ignore the characterDisplayName param since we already know the character)
  const handleUpdateCharacterFinance = (_displayName: string, rows: FinanceRow[]) => {
    updateCharacterFinance(rows);
  };

  const handleAddCharacterInventory = (_displayName: string, item: InventoryRow) => {
    addCharacterInventory(item);
  };

  const handleAddCharacterAmmo = (_displayName: string, ammo: AmmoRow) => {
    addCharacterAmmo(ammo);
  };

  const handleAddCharacterWeapon = (_displayName: string, weapon: WeaponRow) => {
    addCharacterWeapon(weapon);
  };

  const handleAddCharacterArmour = (_displayName: string, armour: ArmourRow) => {
    addCharacterArmour(armour);
  };

  const handleFireRound = (_displayName: string, ammoIndex: number) => {
    fireRound(ammoIndex);
  };

  const handleReloadWeapon = (_displayName: string, ammoIndex: number) => {
    reloadWeapon(ammoIndex);
  };

  // Handle missing campaignId after all hooks are called
  if (!campaignId) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen transition-colors duration-500">
      {/* Header with Back Button */}
      <div className="glass sticky top-0 z-50 px-4 py-4 border-b">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="btn"
            >
              ← Back to Campaigns
            </button>
            <div>
              <h1 className="text-2xl font-bold">
                Campaign Dashboard
              </h1>
              <p className="text-sm text-muted">
                Campaign ID: {campaignId}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-8">
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
          characterFinance={characterFinance}
          characterInventory={characterInventory}
          characterWeapons={characterWeapons}
          characterArmour={characterArmour}
          characterAmmo={characterAmmo}
          selectedCharacterDisplayName={actualSelectedCharacter}
          characterBalance={balances.character}
          onCharacterChange={setSelectedCharacter}
          onUpdatePartyFinances={updatePartyFinances}
          onUpdateShipAccounts={updateShipAccounts}
          onAddCargoLeg={addCargoLeg}
          onUpdateCharacterFinance={handleUpdateCharacterFinance}
          onAddCharacterInventory={handleAddCharacterInventory}
          onAddCharacterAmmo={handleAddCharacterAmmo}
          onAddCharacterWeapon={handleAddCharacterWeapon}
          onAddCharacterArmour={handleAddCharacterArmour}
          onFireRound={handleFireRound}
          onReloadWeapon={handleReloadWeapon}
        />
      </div>
    </div>
  );
}
