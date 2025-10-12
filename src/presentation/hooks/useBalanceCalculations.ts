import { useMemo } from "react";
import { getCurrentBalance } from "../../shared/utils/finance";
import type { CampaignState } from "../../types";

/**
 * Custom hook for balance calculations
 * Separates balance computation logic from UI components
 * Follows Single Responsibility Principle
 */
export function useBalanceCalculations(
  state: CampaignState,
  selectedCharacterDisplayName: string
) {
  // Memoize balance calculations to prevent unnecessary recalculations
  const balances = useMemo(() => {
    return {
      party: getCurrentBalance(state.Party_Finances, 0),
      ship: getCurrentBalance(state.Ship_Accounts, 0),
      character: getCurrentBalance(
        state.PCs[selectedCharacterDisplayName]?.Finance || [],
        0
      ),
    };
  }, [
    state.Party_Finances,
    state.Ship_Accounts,
    state.PCs,
    selectedCharacterDisplayName,
  ]);

  return balances;
}
