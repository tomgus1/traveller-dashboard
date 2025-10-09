import { CampaignState } from "../types";
import { PC_NAMES } from "../constants";

const STORAGE_KEY = "traveller-ui-state-v1";

export const DEFAULT_STATE: CampaignState = {
  Party_Finances: [],
  Ship_Accounts: [],
  Ship_Cargo: [],
  Ship_Maintenance_Log: [],
  Loans_Mortgage: [],
  Party_Inventory: [],
  Ammo_Tracker: [],
  PCs: Object.fromEntries(
    PC_NAMES.map((n) => [
      n,
      { Finance: [], Inventory: [], Weapons: [], Armor: [], Ammo: [] },
    ]),
  ) as any,
};

export function loadState(): CampaignState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    for (const name of PC_NAMES) {
      if (!parsed.PCs[name])
        parsed.PCs[name] = {
          Finance: [],
          Inventory: [],
          Weapons: [],
          Armor: [],
          Ammo: [],
        };
      if (!parsed.PCs[name].Ammo) parsed.PCs[name].Ammo = [];
    }
    return parsed;
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: CampaignState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
