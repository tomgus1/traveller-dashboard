import { useState, useEffect, useCallback } from "react";
import {
  loadState,
  saveState,
  initializeCharacterData,
} from "../../infrastructure/storage/storage";
import weaponsData from "../../data/traveller-weapons.json";
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

        const currentAmmo = existingCharacter.Ammo || [];
        const currentFinance = existingCharacter.Finance || [];

        // Check if ammo for this weapon already exists
        const existingAmmoIndex = currentAmmo.findIndex(
          (a) =>
            a.Weapon === ammo.Weapon && a["Ammo Type"] === ammo["Ammo Type"]
        );

        let updatedAmmo;
        if (existingAmmoIndex >= 0) {
          // Merge with existing ammo entry
          updatedAmmo = [...currentAmmo];
          const existing = updatedAmmo[existingAmmoIndex];
          updatedAmmo[existingAmmoIndex] = {
            ...existing,
            "Spare Magazines":
              Number(existing["Spare Magazines"] || 0) +
              Number(ammo["Spare Magazines"] || 0),
            "Loose Rounds":
              Number(existing["Loose Rounds"] || 0) +
              Number(ammo["Loose Rounds"] || 0),
          };
        } else {
          // Add new ammo entry
          updatedAmmo = [...currentAmmo, ammo];
        }

        // Add finance transaction if ammo has a cost
        let updatedFinance = currentFinance;
        if (ammo.Cost && ammo.Cost > 0) {
          const financeEntry: FinanceRow = {
            Date: new Date().toISOString().split("T")[0],
            Description: `Purchased ${ammo["Ammo Type"]} for ${ammo.Weapon}`,
            Category: "Expense",
            Subcategory: "Ammo",
            ["Amount (Cr)"]: Math.abs(ammo.Cost),
            ["Paid By"]: characterDisplayName,
            Notes: ammo.Notes || "",
          };
          updatedFinance = [...currentFinance, financeEntry];
        }

        return {
          ...prev,
          PCs: {
            ...prev.PCs,
            [characterDisplayName]: {
              ...existingCharacter,
              Ammo: updatedAmmo,
              Finance: updatedFinance,
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

        // Check if weapon has a magazine and auto-create ammo entry
        const weaponData = weaponsData.weapons.find(
          (w) => w.name === weapon.Weapon
        );
        let updatedAmmo = existingCharacter.Ammo || [];

        if (
          weaponData &&
          weaponData.magazine !== null &&
          weaponData.magazine > 0
        ) {
          // Check if ammo already exists for this weapon
          const existingAmmoIndex = updatedAmmo.findIndex(
            (a) => a.Weapon === weapon.Weapon
          );

          if (existingAmmoIndex === -1) {
            // Create initial ammo entry for this weapon
            updatedAmmo = [
              ...updatedAmmo,
              {
                Weapon: weapon.Weapon,
                "Ammo Type": weapon.Type || "",
                "Magazine Size": weaponData.magazine,
                "Rounds Loaded": 0, // Start with empty magazine
                "Spare Magazines": 0,
                "Loose Rounds": 0,
                Notes: "Auto-created with weapon",
              },
            ];
          }
        }

        // Add finance transaction if weapon has a cost
        let updatedFinance = existingCharacter.Finance || [];
        if (weapon.Cost && weapon.Cost > 0) {
          const newTransaction: FinanceRow = {
            Date: new Date().toISOString().split("T")[0],
            Description: `Purchased ${weapon.Weapon}`,
            Category: "Expense",
            Subcategory: "Weapons",
            ["Amount (Cr)"]: Math.abs(weapon.Cost),
            ["Paid By"]: characterDisplayName,
            Notes: weapon.Notes || "",
          };
          updatedFinance = [...updatedFinance, newTransaction];
        }

        return {
          ...prev,
          PCs: {
            ...prev.PCs,
            [characterDisplayName]: {
              ...existingCharacter,
              Weapons: [...(existingCharacter.Weapons || []), weapon],
              Ammo: updatedAmmo,
              Finance: updatedFinance,
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

        // Add finance transaction if armour has a cost
        let updatedFinance = existingCharacter.Finance || [];
        if (armour.Cost && armour.Cost > 0) {
          const newTransaction: FinanceRow = {
            Date: new Date().toISOString().split("T")[0],
            Description: `Purchased ${armour.Armour}`,
            Category: "Expense",
            Subcategory: "Armour",
            ["Amount (Cr)"]: Math.abs(armour.Cost),
            ["Paid By"]: characterDisplayName,
            Notes: armour.Notes || "",
          };
          updatedFinance = [...updatedFinance, newTransaction];
        }

        return {
          ...prev,
          PCs: {
            ...prev.PCs,
            [characterDisplayName]: {
              ...existingCharacter,
              Armour: [...(existingCharacter.Armour || []), armour],
              Finance: updatedFinance,
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
