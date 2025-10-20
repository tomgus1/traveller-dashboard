import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useStandaloneCharacters } from "../hooks/useStandaloneCharacters";
import { Button } from "./Button";
import { Modal } from "./Modal";
import FormField from "./FormField";
import { UserPlus, Users, Trash2, ArrowRight } from "lucide-react";
import type { SimpleCharacter } from "../../shared/constants/constants";
import type { CampaignWithMeta } from "../../core/entities";
import { CharacterCampaignAssignment } from "./CharacterCampaignAssignment";

interface StandaloneCharacterListProps {
  characters: SimpleCharacter[];
  currentUserId?: string;
  onDeleteCharacter: (characterId: string, characterName: string) => void;
}

function StandaloneCharacterList({
  characters,
  currentUserId,
  onDeleteCharacter,
}: StandaloneCharacterListProps) {
  if (characters.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-400">
        <Users className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
        <p>No standalone characters yet.</p>
        <p className="text-sm mt-1">
          Create your first character to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {characters.map((character) => (
        <div
          key={character.id}
          className="border rounded-lg p-4 bg-white dark:bg-zinc-800 dark:border-zinc-700"
        >
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-medium text-gray-900 dark:text-zinc-50 truncate">
              {character.displayName}
            </h4>
            {character.ownerId === currentUserId && (
              <Button
                onClick={() =>
                  onDeleteCharacter(character.id, character.displayName)
                }
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 p-1 h-auto"
                title="Delete character"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <div>
              <span className="font-medium">Player:</span>{" "}
              {character.playerName}
            </div>
            <div>
              <span className="font-medium">Character:</span>{" "}
              {character.characterName}
            </div>
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
              Available for campaign invitations
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface StandaloneCharacterManagementProps {
  campaigns?: CampaignWithMeta[];
}

export default function StandaloneCharacterManagement({
  campaigns = [],
}: StandaloneCharacterManagementProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  const { user } = useAuth();
  const {
    characters,
    loading,
    error: hookError,
    createCharacter,
    deleteCharacter,
    refreshCharacters,
  } = useStandaloneCharacters(user?.id);

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear any existing errors first
    setError(null);

    // Validate user authentication
    if (!user) {
      setError("You must be logged in to create a character");
      return;
    }

    // Validate required fields
    if (!playerName.trim()) {
      setError("Player name is required");
      return;
    }

    if (!characterName.trim()) {
      setError("Character name is required");
      return;
    }

    setCreating(true);

    try {
      const result = await createCharacter(
        playerName.trim(),
        characterName.trim(),
        user.id
      );

      if (result.success) {
        setShowCreateModal(false);
        setPlayerName("");
        setCharacterName("");
        setError(null);
      } else {
        setError(result.error || "Failed to create character");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRequest = (characterId: string, characterName: string) => {
    setCharacterToDelete({ id: characterId, name: characterName });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (characterToDelete && user) {
      try {
        const result = await deleteCharacter(characterToDelete.id, user.id);

        if (result.success) {
          setShowDeleteModal(false);
          setCharacterToDelete(null);
        } else {
          setError(result.error || "Failed to delete character");
        }
      } catch {
        setError("An unexpected error occurred while deleting character");
      }
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setPlayerName("");
    setCharacterName("");
    setError(null);
  };

  const handleOpenModal = () => {
    setShowCreateModal(true);
    setPlayerName("");
    setCharacterName("");
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
            Your Characters
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Create characters that can be used in any campaign when invited.
          </p>
        </div>
        <div className="flex gap-3">
          {campaigns.length > 0 && (
            <Button
              onClick={() => setShowAssignmentModal(true)}
              variant="ghost"
              className="flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              Assign to Campaigns
            </Button>
          )}
          <Button onClick={handleOpenModal} className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Create Character
          </Button>
        </div>
      </div>

      {/* Character List */}
      <div className="card">
        {loading && (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <p>Loading characters...</p>
          </div>
        )}

        {!loading && hookError && (
          <div className="text-center py-6 text-red-600 dark:text-red-400">
            <p>Error: {hookError}</p>
            <Button
              onClick={refreshCharacters}
              variant="ghost"
              size="sm"
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {!loading && !hookError && (
          <StandaloneCharacterList
            characters={characters}
            currentUserId={user?.id}
            onDeleteCharacter={handleDeleteRequest}
          />
        )}
      </div>

      {/* Create Character Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        title="Create New Character"
      >
        <form onSubmit={handleCreateCharacter} className="space-y-4">
          <FormField
            label="Player Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g., John Smith"
            required
          />

          <FormField
            label="Character Name"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder="e.g., Lt. Sally Riddle"
            required
          />

          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCloseModal}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating || !playerName.trim() || !characterName.trim()}
            >
              {creating ? "Creating..." : "Create Character"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Character"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete "{characterToDelete?.name}"? This
            action cannot be undone.
          </p>

          <div className="flex gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              Delete Character
            </Button>
          </div>
        </div>
      </Modal>

      {/* Character Campaign Assignment Modal */}
      <CharacterCampaignAssignment
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        campaigns={campaigns}
        onAssignmentComplete={() => {
          // Refresh the character list after assignment
          refreshCharacters();
        }}
      />
    </div>
  );
}
