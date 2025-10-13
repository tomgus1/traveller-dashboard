import { useCallback } from "react";
import { initializeCharacterData } from "../../infrastructure/storage/storage";
import type { AmmoRow, CampaignState } from "../../types";

/**
 * Custom hook for ammunition tracking and management
 * Handles ammo firing, reloading, and state updates
 */
export function useAmmoActions(
  setState: React.Dispatch<React.SetStateAction<CampaignState>>
) {
  const updateCharacterAmmo = useCallback(
    (characterDisplayName: string, ammoIndex: number, updatedAmmo: AmmoRow) => {
      setState((prev) => {
        // Initialize character data if it does not exist
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
              Ammo: (existingCharacter.Ammo || []).map((ammo, index) =>
                index === ammoIndex ? updatedAmmo : ammo
              ),
            },
          },
        };
      });
    },
    [setState]
  );

  const fireRound = useCallback(
    (characterId: string, ammoIndex: number) => {
      setState((prev) => {
        // Initialize character data if it doesn't exist
        if (!prev.PCs[characterId]) {
          initializeCharacterData(characterId);
          return prev;
        }

        const currentAmmo = prev.PCs[characterId]?.Ammo?.[ammoIndex];
        if (!currentAmmo) return prev;

        const roundsLoaded = Number(currentAmmo["Rounds Loaded"] || 0);
        const spareMagazines = Number(currentAmmo["Spare Magazines"] || 0);
        const looseRounds = Number(currentAmmo["Loose Rounds"] || 0);
        const magazineSize = Number(currentAmmo["Magazine Size"] || 0);

        let newRoundsLoaded = roundsLoaded;
        let newSpareMagazines = spareMagazines;
        let newLooseRounds = looseRounds;

        // Fire one round
        if (newRoundsLoaded > 0) {
          newRoundsLoaded -= 1;
        } else if (newSpareMagazines > 0) {
          // Reload from spare magazine
          newSpareMagazines -= 1;
          newRoundsLoaded = magazineSize - 1;
        } else if (newLooseRounds > 0 && magazineSize > 0) {
          // Load loose rounds into magazine
          const roundsToLoad = Math.min(newLooseRounds, magazineSize);
          newLooseRounds -= roundsToLoad;
          newRoundsLoaded = roundsToLoad - 1;
        } else {
          // No ammo available
          return prev;
        }

        const newTotalRounds =
          newRoundsLoaded + newSpareMagazines * magazineSize + newLooseRounds;

        const updatedAmmo = {
          ...currentAmmo,
          "Rounds Loaded": newRoundsLoaded,
          "Spare Magazines": newSpareMagazines,
          "Loose Rounds": newLooseRounds,
          "Total Rounds": newTotalRounds,
        };

        return {
          ...prev,
          PCs: {
            ...prev.PCs,
            [characterId]: {
              ...prev.PCs[characterId],
              Ammo: (prev.PCs[characterId].Ammo || []).map((ammo, index) =>
                index === ammoIndex ? updatedAmmo : ammo
              ),
            },
          },
        };
      });
    },
    [setState]
  );

  const reloadWeapon = useCallback(
    (characterId: string, ammoIndex: number) => {
      setState((prev) => {
        // Initialize character data if it doesn't exist
        if (!prev.PCs[characterId]) {
          initializeCharacterData(characterId);
          return prev;
        }

        const currentAmmo = prev.PCs[characterId]?.Ammo?.[ammoIndex];
        if (!currentAmmo) return prev;

        const roundsLoaded = Number(currentAmmo["Rounds Loaded"] || 0);
        const spareMagazines = Number(currentAmmo["Spare Magazines"] || 0);
        const looseRounds = Number(currentAmmo["Loose Rounds"] || 0);
        const magazineSize = Number(currentAmmo["Magazine Size"] || 0);

        let newRoundsLoaded = roundsLoaded;
        let newSpareMagazines = spareMagazines;
        let newLooseRounds = looseRounds;

        // Try to reload from spare magazines first
        if (newSpareMagazines > 0 && newRoundsLoaded < magazineSize) {
          newSpareMagazines -= 1;
          newRoundsLoaded = magazineSize;
        } else if (newLooseRounds > 0 && newRoundsLoaded < magazineSize) {
          // Reload from loose rounds
          const roundsNeeded = magazineSize - newRoundsLoaded;
          const roundsToLoad = Math.min(newLooseRounds, roundsNeeded);
          newLooseRounds -= roundsToLoad;
          newRoundsLoaded += roundsToLoad;
        }

        const newTotalRounds =
          newRoundsLoaded + newSpareMagazines * magazineSize + newLooseRounds;

        const updatedAmmo = {
          ...currentAmmo,
          "Rounds Loaded": newRoundsLoaded,
          "Spare Magazines": newSpareMagazines,
          "Loose Rounds": newLooseRounds,
          "Total Rounds": newTotalRounds,
        };

        return {
          ...prev,
          PCs: {
            ...prev.PCs,
            [characterId]: {
              ...prev.PCs[characterId],
              Ammo: (prev.PCs[characterId].Ammo || []).map((ammo, index) =>
                index === ammoIndex ? updatedAmmo : ammo
              ),
            },
          },
        };
      });
    },
    [setState]
  );

  return {
    updateCharacterAmmo,
    fireRound,
    reloadWeapon,
  };
}
