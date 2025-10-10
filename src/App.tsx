import { useState } from "react";
import { Upload, Download } from "lucide-react";

import { PC_NAMES } from "./constants";
import { fmtCr } from "./utils/number";
import { TabsBar } from "./components/Tabs";
import { useAppState } from "./hooks/useAppState";
import { useBalanceCalculations } from "./hooks/useBalanceCalculations";
import { useImportExport } from "./hooks/useImportExport";

import Cargo from "./features/cargo/Cargo";
import FinanceManager from "./components/FinanceManager";
import CharacterSection from "./components/CharacterSection";

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
    setState,
  } = useAppState();

  const balances = useBalanceCalculations(state, pc);
  const { handleImport, handleExport } = useImportExport(setState, state);

  return (
    <div className="p-6 space-y-6">
      {/* Header / Import–Export */}
      <div className="flex flex-wrap items-centre justify-between gap-3">
        <h1 className="text-2xl font-bold">Traveller Campaign Dashboard</h1>
        <div className="flex gap-2">
          <label className="btn cursor-pointer">
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const result = await handleImport(f);
                  if (!result.success) {
                    // Handle error appropriately - could show a toast or error message
                    // For now, we'll just reset the input
                    e.target.value = "";
                  }
                }
              }}
            />
            <Upload className="w-4 h-4" /> Import XLSX
          </label>
          <button
            className="btn"
            onClick={async () => {
              const result = await handleExport();
              if (!result.success) {
                // Handle export error appropriately
                // Could show user feedback here
              }
            }}
          >
            <Download className="w-4 h-4" /> Export XLSX
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-xs text-zinc-500">Party Fund</div>
          <div className="text-xl font-semibold">{fmtCr(balances.party)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-zinc-500">Ship Fund</div>
          <div className="text-xl font-semibold">{fmtCr(balances.ship)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-zinc-500">Cargo Legs</div>
          <div className="text-xl font-semibold">{state.Ship_Cargo.length}</div>
        </div>
        <div className="card">
          <div className="text-xs text-zinc-500">PCs Tracked</div>
          <div className="text-xl font-semibold">{PC_NAMES.length}</div>
        </div>
      </div>

      {/* Top-level tabs */}
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

      {/* Tab Content */}
      {tab === "party" && (
        <FinanceManager
          title="Party"
          rows={state.Party_Finances}
          onUpdate={updatePartyFinances}
          fundName="Party Fund"
          initialBalance={0}
          showSummary={true}
        />
      )}

      {tab === "ship" && (
        <FinanceManager
          title="Ship"
          rows={state.Ship_Accounts}
          onUpdate={updateShipAccounts}
          fundName="Ship Fund"
          initialBalance={0}
          showSummary={true}
        />
      )}

      {tab === "cargo" && <Cargo rows={state.Ship_Cargo} onAdd={addCargoLeg} />}

      {tab === "characters" && (
        <CharacterSection
          selectedPc={pc}
          onPcChange={setPc}
          characterBalance={balances.character}
          characterFinance={state.PCs[pc].Finance}
          characterInventory={state.PCs[pc].Inventory}
          characterAmmo={state.PCs[pc].Ammo || []}
          onUpdateFinance={updateCharacterFinance}
          onAddInventory={addCharacterInventory}
          onAddAmmo={addCharacterAmmo}
        />
      )}
    </div>
  );
}
