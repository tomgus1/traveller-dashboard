import { useState, useEffect, useCallback } from "react";
import {
  loadState,
  saveState,
  initializeCharacterData,
} from "../../infrastructure/storage/storage";
import { useAmmoActions } from "./useAmmoActions";
import type {
  CampaignState,
  FinanceRow,
  CargoRow,
  InventoryRow,
  AmmoRow,
  WeaponRow,
  ArmourRow,
} from "../../types";

/**
 * Custom hook for application state management
 * Follows Single Responsibility Principle by isolating state logic
 * Provides type-safe state updates
 */
export function useAppState() {
  const [state, setState] = useState<CampaignState>(loadState());

  // Auto-save state changes to localStorage
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Type-safe state update functions
  const updatePartyFinances = useCallback((rows: FinanceRow[]) => {
    setState((prev) => ({ ...prev, Party_Finances: rows }));
  }, []);

  const updateShipAccounts = useCallback((rows: FinanceRow[]) => {
    setState((prev) => ({ ...prev, Ship_Accounts: rows }));
  }, []);

  const addCargoLeg = useCallback((cargo: CargoRow) => {
    setState((prev) => ({
      ...prev,
      Ship_Cargo: [...prev.Ship_Cargo, cargo],
    }));
  }, []);

  const updateCharacterFinance = useCallback(
    (characterDisplayName: string, rows: FinanceRow[]) => {
      setState((prev) => {
        // Initialize character data if it doesn't exist
        if (!prev.PCs[characterDisplayName]) {
          initializeCharacterData(characterDisplayName);
        }
        return {
          ...prev,
          PCs: {
            ...prev.PCs,
            [characterDisplayName]: {
              ...(prev.PCs[characterDisplayName] || {
                Finance: [],
                Inventory: [],
                Weapons: [],
                Armour: [],
                Ammo: [],
              }),
              Finance: rows,
            },
          },
        };
      });
    },
    []
  );

  const addCharacterInventory = useCallback(
    (characterDisplayName: string, item: InventoryRow) => {
      setState((prev) => {
        // Initialize character data if it doesn't exist
        if (!prev.PCs[characterDisplayName]) {
          initializeCharacterData(characterDisplayName);
        }
        const existingCharacter = prev.PCs[characterDisplayName] || {
          Finance: [],
          Inventory: [],
          Weapons: [],
          Armour: [],
          Ammo: [],
        };
        return {
          ...prev,
          PCs: {
            ...prev.PCs,
            [characterDisplayName]: {
              ...existingCharacter,
              Inventory: [...existingCharacter.Inventory, item],
            },
          },
        };
      });
    },
    []
  );

  const addCharacterAmmo = useCallback(
    (characterDisplayName: string, ammo: AmmoRow) => {
      setState((prev) => {
        // Initialize character data if it doesn't exist
        if (!prev.PCs[characterDisplayName]) {
          initializeCharacterData(characterDisplayName);
        }
        const existingCharacter = prev.PCs[characterDisplayName] || {
          Finance: [],
          Inventory: [],
          Weapons: [],
          Armour: [],
          Ammo: [],
        };
        return {
          ...prev,
          PCs: {
            ...prev.PCs,
            [characterDisplayName]: {
              ...existingCharacter,
              Ammo: [...(existingCharacter.Ammo || []), ammo],
            },
          },
        };
      });
    },
    []
  );

  const addCharacterWeapon = useCallback(
    (characterDisplayName: string, weapon: WeaponRow) => {
      setState((prev) => {
        // Initialize character data if it doesn't exist
        if (!prev.PCs[characterDisplayName]) {
          initializeCharacterData(characterDisplayName);
        }
        const existingCharacter = prev.PCs[characterDisplayName] || {
          Finance: [],
          Inventory: [],
          Weapons: [],
          Armour: [],
          Ammo: [],
        };
        return {
          ...prev,
          PCs: {
            ...prev.PCs,
            [characterDisplayName]: {
              ...existingCharacter,
              Weapons: [...(existingCharacter.Weapons || []), weapon],
            },
          },
        };
      });
    },
    []
  );

  const addCharacterArmour = useCallback(
    (characterDisplayName: string, armour: ArmourRow) => {
      setState((prev) => {
        // Initialize character data if it doesn't exist
        if (!prev.PCs[characterDisplayName]) {
          initializeCharacterData(characterDisplayName);
        }
        const existingCharacter = prev.PCs[characterDisplayName] || {
          Finance: [],
          Inventory: [],
          Weapons: [],
          Armour: [],
          Ammo: [],
        };
        return {
          ...prev,
          PCs: {
            ...prev.PCs,
            [characterDisplayName]: {
              ...existingCharacter,
              Armour: [...(existingCharacter.Armour || []), armour],
            },
          },
        };
      });
    },
    []
  );

  const ammoActions = useAmmoActions(setState);

  return {
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
    ...ammoActions,
  };
}
