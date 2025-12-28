import { useEffect, useCallback, useMemo } from "react";
import type { SimpleCharacter } from "../../shared/constants/constants";
import { getCampaignRepository } from "../../core/container";
import { useAsyncList } from "./useAsyncOperation";

export function useStandaloneCharacters(userId?: string) {
  const {
    items: characters,
    loading,
    error,
    execute,
    setItems: setCharacters,
  } = useAsyncList<SimpleCharacter, [string]>();

  const campaignRepo = useMemo(() => getCampaignRepository(), []);

  // Load standalone characters for a user
  const loadStandaloneCharacters = useCallback(
    async (uId: string) => {
      if (!uId) return;

      const loadOperation = async (userId: string) => {
        const result = await campaignRepo.getStandaloneCharacters(userId);

        if (result.success && result.data) {
          // Transform database results to SimpleCharacter format
          const transformedCharacters: SimpleCharacter[] = result.data.map(
            (char: {
              id: string;
              name: string;
              playerName?: string;
              characterName?: string;
              ownerId?: string;
            }) => ({
              id: char.id,
              campaignId: null, // Always null for standalone characters
              displayName: char.name,
              playerName: char.playerName || "",
              characterName: char.characterName || "",
              ownerId: char.ownerId || "",
            })
          );

          return { success: true, data: transformedCharacters };
        }

        return {
          success: false,
          error: result.error || "Failed to load characters",
        };
      };

      await execute(loadOperation, uId);
    },
    [campaignRepo, execute]
  );

  // Create a new standalone character
  const createStandaloneCharacter = useCallback(
    async (playerName: string, characterName: string, uId: string) => {
      try {
        const displayName = `${playerName} – ${characterName}`;

        const result = await campaignRepo.createStandaloneCharacter(
          uId,
          {
            name: displayName,
            playerName,
            characterName
          }
        );

        if (result.success && result.data) {
          // Transform the result to SimpleCharacter format
          const newCharacter: SimpleCharacter = {
            id: result.data.id,
            campaignId: null,
            displayName: result.data.name,
            playerName: result.data.playerName || playerName,
            characterName: result.data.characterName || characterName,
            ownerId: result.data.ownerId || "",
          };

          // Add to local state for immediate UI update
          setCharacters((prev) => [newCharacter, ...prev]);

          return { success: true, data: newCharacter };
        }

        return {
          success: false,
          error: result.error || "Failed to create character",
        };
      } catch {
        return {
          success: false,
          error: "An error occurred while creating the character",
        };
      }
    },
    [campaignRepo, setCharacters]
  );

  // Delete a standalone character
  const deleteStandaloneCharacter = useCallback(
    async (characterId: string, uId: string) => {
      try {
        const result = await campaignRepo.deleteStandaloneCharacter(
          characterId,
          uId
        );

        if (result.success) {
          // Remove from local state for immediate UI update
          setCharacters((prev) =>
            prev.filter((char) => char.id !== characterId)
          );
          return { success: true };
        }

        return {
          success: false,
          error: result.error || "Failed to delete character",
        };
      } catch {
        return {
          success: false,
          error: "An error occurred while deleting the character",
        };
      }
    },
    [campaignRepo, setCharacters]
  );

  // Load characters when userId changes
  useEffect(() => {
    if (userId) {
      loadStandaloneCharacters(userId);
    } else {
      setCharacters([]);
    }
  }, [userId, loadStandaloneCharacters, setCharacters]);

  return {
    characters,
    loading,
    error,
    createCharacter: createStandaloneCharacter,
    deleteCharacter: deleteStandaloneCharacter,
    refreshCharacters: () => userId && loadStandaloneCharacters(userId),
  };
}
