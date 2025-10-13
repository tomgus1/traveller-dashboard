import type { CampaignState } from "../../types";

const STORAGE_KEY = "traveller-ui-state-v1";

export const DEFAULT_STATE: CampaignState = {
  Party_Finances: [],
  Ship_Accounts: [],
  Ship_Cargo: [],
  Ship_Maintenance_Log: [],
  Loans_Mortgage: [],
  Party_Inventory: [],
  Ammo_Tracker: [],
  PCs: {},
};

export function loadState(): CampaignState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);

    // Ensure PCs object exists and has proper structure
    if (!parsed.PCs) {
      parsed.PCs = {};
    }

    // For existing character entries, ensure all required properties exist
    Object.keys(parsed.PCs).forEach((characterKey) => {
      if (!parsed.PCs[characterKey].Finance)
        parsed.PCs[characterKey].Finance = [];
      if (!parsed.PCs[characterKey].Inventory)
        parsed.PCs[characterKey].Inventory = [];
      if (!parsed.PCs[characterKey].Weapons)
        parsed.PCs[characterKey].Weapons = [];
      if (!parsed.PCs[characterKey].Armour)
        parsed.PCs[characterKey].Armour = [];
      if (!parsed.PCs[characterKey].Ammo) parsed.PCs[characterKey].Ammo = [];
    });

    return parsed;
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: CampaignState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function initializeCharacterData(characterDisplayName: string): void {
  const state = loadState();
  if (!state.PCs[characterDisplayName]) {
    state.PCs[characterDisplayName] = {
      Finance: [],
      Inventory: [],
      Weapons: [],
      Armour: [],
      Ammo: [],
    };
    saveState(state);
  }
}
