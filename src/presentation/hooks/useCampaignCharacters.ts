import { useEffect, useCallback, useMemo } from "react";
import type { SimpleCharacter } from "../../shared/constants/constants";
import { SupabaseCampaignRepository } from "../../infrastructure/database";
import { useAsyncList } from "./useAsyncOperation";

// For now, we'll use a simple in-memory approach that can be easily migrated to database
export function useCampaignCharacters(campaignId?: string) {
  const {
    items: characters,
    loading,
    error,
    execute,
    setItems: setCharacters,
  } = useAsyncList<SimpleCharacter, [string]>();

  const campaignRepo = useMemo(() => new SupabaseCampaignRepository(), []);

  // Load characters for a campaign
  const loadCharacters = useCallback(
    async (cId: string) => {
      if (!cId) return;

      const loadOperation = async (campaignId: string) => {
        // Try to load from database first
        const result = await campaignRepo.getCharactersByCampaign(campaignId);

        if (result.success && result.data && result.data.length > 0) {
          // Convert database characters to SimpleCharacter format
          const dbCharacters: SimpleCharacter[] = result.data.map(
            (char: {
              id: string;
              campaign_id: string | null;
              name: string;
              player_name?: string | null;
              character_name?: string | null;
              owner_id?: string | null;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              characteristics?: any;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              skills?: any;
            }) => ({
              id: char.id,
              campaignId: char.campaign_id || "",
              displayName: char.name,
              playerName: char.player_name || "",
              characterName: char.character_name || "",
              ownerId: char.owner_id || undefined,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              stats: char.characteristics as any,
              skills: char.skills as Array<{ name: string; level: number; xp?: number }>,
            })
          );
          return { success: true, data: dbCharacters };
        }

        // No characters in database yet
        return { success: true, data: [] };
      };

      await execute(loadOperation, cId);
    },
    [campaignRepo, execute]
  );

  // Create a new character
  const createCharacter = useCallback(
    async (playerName: string, characterName: string, userId: string) => {
      if (!campaignId) return { success: false, error: "No campaign selected" };

      try {
        const displayName = `${playerName} – ${characterName}`;
        const result = await campaignRepo.createCharacterForCampaign(
          campaignId,
          userId,
          displayName,
          playerName,
          characterName
        );

        if (result.success && result.data) {
          const newCharacter: SimpleCharacter = {
            id: result.data.id,
            campaignId: result.data.campaign_id || "",
            displayName: result.data.name,
            playerName, // Use the passed parameter since DB might not have it yet
            characterName, // Use the passed parameter since DB might not have it yet
            ownerId: result.data.owner_id || undefined,
          };

          setCharacters((prev) => [...prev, newCharacter]);
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
    [campaignId, campaignRepo, setCharacters]
  );

  // Delete a character
  const deleteCharacter = useCallback(
    async (characterId: string, userId: string) => {
      try {
        const result = await campaignRepo.deleteCharacter(characterId, userId);

        if (result.success) {
          // Remove the character from the local state
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

  // Update a character
  const updateCharacter = useCallback(
    async (
      characterId: string,
      updates: Partial<{
        name: string;
        characteristics: {
          STR: { value: number; xp: number };
          DEX: { value: number; xp: number };
          END: { value: number; xp: number };
          INT: { value: number; xp: number };
          EDU: { value: number; xp: number };
          SOC: { value: number; xp: number };
        };
        skills: Array<{ name: string; level: number; xp?: number }>;
      }>
    ) => {
      try {
        const result = await campaignRepo.updateCharacter(characterId, updates);

        if (result.success) {
          // Update local state
          setCharacters((prev) =>
            prev.map((char) =>
              char.id === characterId
                ? {
                  ...char,
                  displayName: updates.name || char.displayName,
                  stats: updates.characteristics
                    ? updates.characteristics
                    : char.stats || { // Fallback to default structure if not provided
                      STR: { value: 0, xp: 0 },
                      DEX: { value: 0, xp: 0 },
                      END: { value: 0, xp: 0 },
                      INT: { value: 0, xp: 0 },
                      EDU: { value: 0, xp: 0 },
                      SOC: { value: 0, xp: 0 },
                    },
                  skills: updates.skills || char.skills,
                }
                : char
            )
          );
          return { success: true };
        }

        return {
          success: false,
          error: result.error || "Failed to update character",
        };
      } catch {
        return {
          success: false,
          error: "An error occurred while updating the character",
        };
      }
    },
    [campaignRepo, setCharacters]
  );

  // Load characters when campaign changes
  useEffect(() => {
    if (campaignId) {
      loadCharacters(campaignId);
    } else {
      setCharacters([]);
    }
  }, [campaignId, loadCharacters, setCharacters]);

  return {
    characters,
    loading,
    error,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    refreshCharacters: () => campaignId && loadCharacters(campaignId),
  };
}
