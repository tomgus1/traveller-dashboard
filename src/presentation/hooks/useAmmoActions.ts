import { useCallback } from "react";
import type { AmmoRow, CampaignState } from "../../types";

/**
 * Custom hook for ammunition tracking and management
 * Handles ammo firing, reloading, and state updates
 */
export function useAmmoActions(
  setState: React.Dispatch<React.SetStateAction<CampaignState>>
) {
  const updateCharacterAmmo = useCallback(
    (pc: string, ammoIndex: number, updatedAmmo: AmmoRow) => {
      setState((prev) => ({
        ...prev,
        PCs: {
          ...prev.PCs,
          [pc]: {
            ...prev.PCs[pc],
            Ammo: (prev.PCs[pc].Ammo || []).map((ammo, index) =>
              index === ammoIndex ? updatedAmmo : ammo
            ),
          },
        },
      }));
    },
    [setState]
  );

  const fireRound = useCallback(
    (pc: string, ammoIndex: number) => {
      setState((prev) => {
        const currentAmmo = prev.PCs[pc]?.Ammo?.[ammoIndex];
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
          newRoundsLoaded = magazineSize - 1; // Load new mag and fire one round
        } else if (newLooseRounds > 0 && magazineSize > 0) {
          // Load loose rounds into magazine
          const roundsToLoad = Math.min(newLooseRounds, magazineSize);
          newLooseRounds -= roundsToLoad;
          newRoundsLoaded = roundsToLoad - 1; // Load and fire one round
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
            [pc]: {
              ...prev.PCs[pc],
              Ammo: (prev.PCs[pc].Ammo || []).map((ammo, index) =>
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
    (pc: string, ammoIndex: number) => {
      setState((prev) => {
        const currentAmmo = prev.PCs[pc]?.Ammo?.[ammoIndex];
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
            [pc]: {
              ...prev.PCs[pc],
              Ammo: (prev.PCs[pc].Ammo || []).map((ammo, index) =>
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
