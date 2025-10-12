import { useState, useEffect, useCallback } from "react";
import { loadState, saveState } from "../../infrastructure/storage/storage";
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
    (pc: string, rows: FinanceRow[]) => {
      setState((prev) => ({
        ...prev,
        PCs: {
          ...prev.PCs,
          [pc]: { ...prev.PCs[pc], Finance: rows },
        },
      }));
    },
    []
  );

  const addCharacterInventory = useCallback(
    (pc: string, item: InventoryRow) => {
      setState((prev) => ({
        ...prev,
        PCs: {
          ...prev.PCs,
          [pc]: {
            ...prev.PCs[pc],
            Inventory: [...prev.PCs[pc].Inventory, item],
          },
        },
      }));
    },
    []
  );

  const addCharacterAmmo = useCallback((pc: string, ammo: AmmoRow) => {
    setState((prev) => ({
      ...prev,
      PCs: {
        ...prev.PCs,
        [pc]: {
          ...prev.PCs[pc],
          Ammo: [...(prev.PCs[pc].Ammo || []), ammo],
        },
      },
    }));
  }, []);

  const addCharacterWeapon = useCallback((pc: string, weapon: WeaponRow) => {
    setState((prev) => ({
      ...prev,
      PCs: {
        ...prev.PCs,
        [pc]: {
          ...prev.PCs[pc],
          Weapons: [...(prev.PCs[pc].Weapons || []), weapon],
        },
      },
    }));
  }, []);

  const addCharacterArmour = useCallback((pc: string, armour: ArmourRow) => {
    setState((prev) => ({
      ...prev,
      PCs: {
        ...prev.PCs,
        [pc]: {
          ...prev.PCs[pc],
          Armour: [...(prev.PCs[pc].Armour || []), armour],
        },
      },
    }));
  }, []);

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
