import { useEffect, useMemo, useState } from "react";
import { Upload, Download } from "lucide-react";

import { PC_NAMES } from "./constants";
import type { CampaignState } from "./types";
import { loadState, saveState } from "./utils/storage";
import { sumColumn, fmtCr } from "./utils/number";
import { importXlsx, exportXlsx } from "./lib/xlsx";
import { TabsBar } from "./components/Tabs";

import PartyFinances from "./features/party/PartyFinances";
import ShipAccounts from "./features/ship/ShipAccounts";
import Cargo from "./features/cargo/Cargo";
import Characters from "./features/pcs/Characters";
import Inventory from "./features/pcs/Inventory";
import Ammo from "./features/pcs/Ammo";

export default function App() {
  const [state, setState] = useState<CampaignState>(loadState())
  const [pc, setPc] = useState<string>(PC_NAMES[0])
  const [tab, setTab] = useState<'party'|'ship'|'cargo'|'characters'>('party')
  const [charTab, setCharTab] = useState<'ledger'|'inventory'|'ammo'>('ledger')

  useEffect(() => { saveState(state) }, [state])

  const partyBal = useMemo(() => sumColumn(state.Party_Finances, 'Amount (Cr)'), [state])
  const shipBal  = useMemo(() => sumColumn(state.Ship_Accounts, 'Amount (Cr)'), [state])
  const pcBal    = useMemo(() => sumColumn(state.PCs[pc].Finance, 'Amount (Cr)'), [pc, state])

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
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importXlsx(f, setState);
              }}
            />
            <Upload className="w-4 h-4" /> Import XLSX
          </label>
          <button className="btn" onClick={() => exportXlsx(state)}>
            <Download className="w-4 h-4" /> Export XLSX
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-xs text-zinc-500">Party Fund</div>
          <div className="text-xl font-semibold">{fmtCr(partyBal)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-zinc-500">Ship Fund</div>
          <div className="text-xl font-semibold">{fmtCr(shipBal)}</div>
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
        onChange={(id) => setTab(id as 'party'|'ship'|'cargo'|'characters')}
      />

      {tab === "party" && (
        <PartyFinances
          rows={state.Party_Finances}
          onAdd={(r) =>
            setState((s) => ({
              ...s,
              Party_Finances: [...s.Party_Finances, r],
            }))
          }
        />
      )}

      {tab === "ship" && (
        <ShipAccounts
          rows={state.Ship_Accounts}
          onAdd={(r) =>
            setState((s) => ({ ...s, Ship_Accounts: [...s.Ship_Accounts, r] }))
          }
        />
      )}

      {tab === "cargo" && (
        <Cargo
          rows={state.Ship_Cargo}
          onAdd={(r) =>
            setState((s) => ({ ...s, Ship_Cargo: [...s.Ship_Cargo, r] }))
          }
        />
      )}

      {tab === "characters" && (
        <div className="space-y-4">
          {/* Secondary tabs within Characters */}
          <div className="flex items-centre gap-3">
            <select
              className="select"
              value={pc}
              onChange={(e) => setPc(e.target.value)}
            >
              {PC_NAMES.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <div className="text-sm">
              Balance: <span className="font-semibold">{fmtCr(pcBal)}</span>
            </div>
          </div>

          <TabsBar
            tabs={[
              { id: "ledger", label: "Ledger" },
              { id: "inventory", label: "Inventory" },
              { id: "ammo", label: "Ammo" },
            ]}
            active={charTab}
            onChange={(id) => setCharTab(id as 'ledger'|'inventory'|'ammo')}
          />

          {charTab === "ledger" && (
            <Characters
              pcNames={[...PC_NAMES]}
              pc={pc}
              onPcChange={setPc}
              rows={state.PCs[pc].Finance}
              balance={pcBal}
              onAdd={(r) =>
                setState((s) => ({
                  ...s,
                  PCs: {
                    ...s.PCs,
                    [pc]: { ...s.PCs[pc], Finance: [...s.PCs[pc].Finance, r] },
                  },
                }))
              }
            />
          )}

          {charTab === "inventory" && (
            <Inventory
              rows={state.PCs[pc].Inventory}
              onAdd={(r) =>
                setState((s) => ({
                  ...s,
                  PCs: {
                    ...s.PCs,
                    [pc]: {
                      ...s.PCs[pc],
                      Inventory: [...s.PCs[pc].Inventory, r],
                    },
                  },
                }))
              }
            />
          )}

          {charTab === "ammo" && (
            <Ammo
              rows={state.PCs[pc].Ammo || []}
              onAdd={(r) =>
                setState((s) => ({
                  ...s,
                  PCs: {
                    ...s.PCs,
                    [pc]: {
                      ...s.PCs[pc],
                      Ammo: [...(s.PCs[pc].Ammo || []), r],
                    },
                  },
                }))
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
