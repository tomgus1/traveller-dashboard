import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useCampaignCharacters } from "../hooks/useCampaignCharacters";
import { Button } from "./Button";
import { Modal } from "./Modal";
import FormField from "./FormField";
import type { SimpleCharacter } from "../../shared/constants/constants";

interface CharacterManagementProps {
  campaignId: string;
  onCharacterCreated?: () => void;
}

interface CharacterListProps {
  characters: SimpleCharacter[];
  currentUserId?: string;
}

function CharacterList({ characters, currentUserId }: CharacterListProps) {
  if (characters.length === 0) {
    return (
      <p className="text-gray-500 text-sm">
        No characters in this campaign yet. Add your first character!
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {characters.map((character) => (
        <div
          key={character.id}
          className="flex items-center justify-between p-3 border rounded-lg"
        >
          <div>
            <div className="font-medium text-gray-900">
              {character.displayName}
            </div>
            {character.playerName && character.characterName && (
              <div className="text-sm text-gray-600">
                Player: {character.playerName} | Character:{" "}
                {character.characterName}
              </div>
            )}
            {character.id.startsWith("legacy-") && (
              <div className="text-xs text-amber-600">
                Legacy character (hardcoded)
              </div>
            )}
          </div>

          {character.ownerId === currentUserId &&
            !character.id.startsWith("legacy-") && (
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    // TODO: Implement edit functionality
                  }}
                >
                  Edit
                </Button>
              </div>
            )}
        </div>
      ))}
    </div>
  );
}

export default function CharacterManagement({
  campaignId,
  onCharacterCreated,
}: CharacterManagementProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const { characters, createCharacter, refreshCharacters } =
    useCampaignCharacters(campaignId);

  const handleCreateCharacter = async () => {
    if (!user || !playerName.trim() || !characterName.trim()) {
      setError("Please fill in both player name and character name");
      return;
    }

    setCreating(true);
    setError(null);

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
        onCharacterCreated?.();
        refreshCharacters();
      } else {
        setError(result.error || "Failed to create character");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setCreating(false);
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setPlayerName("");
    setCharacterName("");
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Character List */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Campaign Characters
          </h3>
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            size="sm"
          >
            Add Character
          </Button>
        </div>

        <CharacterList characters={characters} currentUserId={user?.id} />
      </div>

      {/* Create Character Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        title="Add New Character"
      >
        <div className="space-y-4">
          <FormField
            label="Player Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g., Andrew"
            required
          />

          <FormField
            label="Character Name"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder="e.g., Dr Vax Vanderpool"
            required
          />

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="flex justify-end gap-3">
            <Button
              variant="default"
              onClick={handleCloseModal}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateCharacter}
              disabled={creating || !playerName.trim() || !characterName.trim()}
            >
              {creating ? "Creating..." : "Create Character"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
