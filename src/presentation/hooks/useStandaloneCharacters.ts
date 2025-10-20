import { useState, useEffect, useCallback } from "react";
import type { SimpleCharacter } from "../../shared/constants/constants";

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
      // TODO: Implement database loading once schema types are updated
      // For now, return empty array
      setCharacters([]);
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
        // TODO: Implement database call once schema types are updated
        // For now, return success but don't actually create in database
        const newCharacter = {
          id: crypto.randomUUID(),
          campaignId: null,
          displayName: `${playerName} – ${characterName}`,
          playerName,
          characterName,
          ownerId: uId,
        };

        return { success: true, data: newCharacter };
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
  const deleteStandaloneCharacter = useCallback(async () => {
    try {
      // TODO: Implement database deletion once schema types are updated
      // For now, return success
      return { success: true };
    } catch {
      return {
        success: false,
        error: "An error occurred while deleting the character",
      };
    }
  }, []);

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
