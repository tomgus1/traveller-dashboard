import { useState, useEffect, useCallback } from "react";
import type { SimpleCharacter } from "../../shared/constants/constants";
import { getCampaignRepository } from "../../core/container";

export function useStandaloneCharacters(userId?: string) {
  const [characters, setCharacters] = useState<SimpleCharacter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load standalone characters for a user
  const loadStandaloneCharacters = useCallback(async (uId: string) => {
    if (!uId) return;

    setLoading(true);
    setError(null);

    try {
      const campaignRepo = getCampaignRepository();
      const result = await campaignRepo.getStandaloneCharacters(uId);

      if (result.success && result.data) {
        // Transform database results to SimpleCharacter format
        const transformedCharacters: SimpleCharacter[] = result.data.map(
          (char: {
            id: string;
            name: string;
            player_name?: string;
            character_name?: string;
            owner_id: string;
          }) => ({
            id: char.id,
            campaignId: null, // Always null for standalone characters
            displayName: char.name,
            playerName: char.player_name || "",
            characterName: char.character_name || "",
            ownerId: char.owner_id,
          })
        );

        setCharacters(transformedCharacters);
      } else {
        setError(result.error || "Failed to load characters");
        setCharacters([]);
      }
    } catch {
      setError("Database connection failed - no characters available");
      setCharacters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new standalone character
  const createStandaloneCharacter = useCallback(
    async (playerName: string, characterName: string, uId: string) => {
      try {
        const campaignRepo = getCampaignRepository();
        const displayName = `${playerName} – ${characterName}`;

        const result = await campaignRepo.createStandaloneCharacter(
          uId,
          displayName,
          playerName,
          characterName
        );

        if (result.success && result.data) {
          // Transform the result to SimpleCharacter format
          const newCharacter: SimpleCharacter = {
            id: result.data.id,
            campaignId: null,
            displayName: result.data.name,
            playerName: result.data.player_name || playerName,
            characterName: result.data.character_name || characterName,
            ownerId: result.data.owner_id,
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
    []
  );

  // Delete a standalone character
  const deleteStandaloneCharacter = useCallback(
    async (characterId: string, uId: string) => {
      try {
        const campaignRepo = getCampaignRepository();
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
    []
  );

  // Load characters when userId changes
  useEffect(() => {
    if (userId) {
      loadStandaloneCharacters(userId);
    } else {
      setCharacters([]);
    }
  }, [userId, loadStandaloneCharacters]);

  return {
    characters,
    loading,
    error,
    createCharacter: createStandaloneCharacter,
    deleteCharacter: deleteStandaloneCharacter,
    refreshCharacters: () => userId && loadStandaloneCharacters(userId),
  };
}
