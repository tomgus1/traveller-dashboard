import { useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useStandaloneCharacters } from "../hooks/useStandaloneCharacters";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { UserPlus, Users } from "lucide-react";
import type { CampaignWithMeta } from "../../core/entities";
import { getCampaignRepository } from "../../core/container";

interface CharacterCampaignAssignmentProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: CampaignWithMeta[];
  onAssignmentComplete?: () => void;
}

interface AssignmentState {
  characterId: string;
  campaignId: string;
  loading: boolean;
}

export function CharacterCampaignAssignment({
  isOpen,
  onClose,
  campaigns,
  onAssignmentComplete,
}: CharacterCampaignAssignmentProps) {
  const { user } = useAuth();
  const {
    characters,
    loading: charactersLoading,
    error: charactersError,
    refreshCharacters,
  } = useStandaloneCharacters(user?.id);
  const [assignments, setAssignments] = useState<AssignmentState[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filter campaigns where user is admin or player
  const eligibleCampaigns = useMemo(() => {
    return campaigns.filter(
      (campaign) => campaign.userRoles.isAdmin || campaign.userRoles.isPlayer
    );
  }, [campaigns]);

  const handleAssignCharacter = async (
    characterId: string,
    campaignId: string
  ) => {
    if (!user) return;

    setError(null);
    setAssignments((prev) => [
      ...prev.filter((a) => a.characterId !== characterId),
      { characterId, campaignId, loading: true },
    ]);

    try {
      const campaignRepo = getCampaignRepository();
      const result = await campaignRepo.assignCharacterToCampaign(
        characterId,
        campaignId,
        user.id
      );

      if (result.success) {
        // Remove the character from standalone characters (it's now assigned)
        await refreshCharacters();

        // Remove from assignment state
        setAssignments((prev) =>
          prev.filter((a) => a.characterId !== characterId)
        );

        onAssignmentComplete?.();
      } else {
        setError(result.error || "Failed to assign character to campaign");
        setAssignments((prev) =>
          prev.filter((a) => a.characterId !== characterId)
        );
      }
    } catch {
      setError("An unexpected error occurred while assigning character");
      setAssignments((prev) =>
        prev.filter((a) => a.characterId !== characterId)
      );
    }
  };

  const isAssigning = (characterId: string) => {
    return assignments.some((a) => a.characterId === characterId && a.loading);
  };

  const getAssignedCampaign = (characterId: string) => {
    return assignments.find((a) => a.characterId === characterId)?.campaignId;
  };

  if (charactersLoading) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Assign Characters to Campaigns"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-2/3"></div>
        </div>
      </Modal>
    );
  }

  if (charactersError) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Assign Characters to Campaigns"
      >
        <div className="text-red-600 dark:text-red-400 text-center py-8">
          <p>Error loading characters: {charactersError}</p>
          <Button
            onClick={refreshCharacters}
            variant="primary"
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </Modal>
    );
  }

  if (characters.length === 0) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Assign Characters to Campaigns"
      >
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg font-medium mb-2">No Standalone Characters</p>
          <p className="text-sm">
            You don't have any standalone characters to assign to campaigns.
          </p>
          <p className="text-sm mt-1">
            Create some characters first, then come back to assign them!
          </p>
        </div>
      </Modal>
    );
  }

  if (eligibleCampaigns.length === 0) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Assign Characters to Campaigns"
      >
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <UserPlus className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg font-medium mb-2">No Available Campaigns</p>
          <p className="text-sm">
            You're not a member of any campaigns where you can add characters.
          </p>
          <p className="text-sm mt-1">
            Join a campaign as a player or create your own to assign characters!
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Characters to Campaigns"
      maxWidth="lg"
    >
      <div className="space-y-6">
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Assign your standalone characters to campaigns where you're a member.
          Once assigned, characters will appear in the campaign's character
          list.
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800  p-4">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {characters.map((character) => (
            <div
              key={character.id}
              className="border  p-4 bg-white dark:bg-zinc-800 dark:border-zinc-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-zinc-50 mb-1">
                    {character.displayName}
                  </h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {character.playerName && character.characterName && (
                      <>
                        Player: {character.playerName} • Character:{" "}
                        {character.characterName}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 ml-4">
                  {isAssigning(character.id) ? (
                    <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                      <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent  mr-2"></div>
                      Assigning...
                    </div>
                  ) : (
                    <select
                      className="text-sm border rounded px-3 py-2 bg-white dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-50"
                      value={getAssignedCampaign(character.id) || ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignCharacter(character.id, e.target.value);
                        }
                      }}
                    >
                      <option value="">Select Campaign...</option>
                      {eligibleCampaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>
                          {campaign.name} (
                          {campaign.userRoles.isAdmin ? "Admin" : "Player"})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
