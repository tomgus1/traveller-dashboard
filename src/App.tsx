import { useState } from "react";

import { PC_NAMES } from "./constants";
import { TabsBar } from "./components/Tabs";
import { useAppState } from "./hooks/useAppState";
import { useBalanceCalculations } from "./hooks/useBalanceCalculations";
import { useImportExport } from "./hooks/useImportExport";

import AppHeader from "./components/AppHeader";
import StatsDashboard from "./components/StatsDashboard";
import TabContent from "./components/TabContent";

export default function App() {
  const [pc, setPc] = useState<string>(PC_NAMES[0]);
  const [tab, setTab] = useState<"party" | "ship" | "cargo" | "characters">(
    "party"
  );

  // Custom hooks for separation of concerns
  const {
    state,
    updatePartyFinances,
    updateShipAccounts,
    addCargoLeg,
    updateCharacterFinance,
    addCharacterInventory,
    addCharacterAmmo,
    addCharacterWeapon,
    addCharacterArmour,
    setState,
  } = useAppState();

  const balances = useBalanceCalculations(state, pc);
  const { handleImport, handleExport } = useImportExport(setState, state);

  return (
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
        onChange={(id) =>
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
      />
    </div>
  );
}
