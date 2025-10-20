import { useState } from "react";
import { useCampaignCharacters } from "../hooks/useCampaignCharacters";
import { useAuth } from "../hooks/useAuth";
import { useStandaloneCharacters } from "../hooks/useStandaloneCharacters";
import { Edit3, Trash2, Users, UserPlus, ArrowRight } from "lucide-react";
import { Button } from "./Button";
import { Modal, ModalFooter } from "./Modal";
import FormField from "./FormField";
import type { CampaignWithMeta, CampaignRoles } from "../../core/entities";
import { CharacterCampaignAssignment } from "./CharacterCampaignAssignment";

interface CharacterManagementContentProps {
  campaigns: CampaignWithMeta[];
  onViewCampaign: (campaignId: string) => void;
}

interface CharacterListProps {
  campaign: CampaignWithMeta;
  onViewCampaign: (campaignId: string) => void;
  onDeleteCharacter: (
    characterId: string,
    characterName: string,
    campaignId: string
  ) => void;
}

// Helper function to get primary role for display purposes
function getPrimaryRole(roles: CampaignRoles): string {
  if (roles.isAdmin) return "admin";
  if (roles.isGm) return "gm";
  if (roles.isPlayer) return "player";
  return "unknown";
}

// Helper function to convert roles to display string
function rolesToDisplayString(roles: CampaignRoles): string {
  const roleList = [];
  if (roles.isAdmin) roleList.push("ADMIN");
  if (roles.isGm) roleList.push("GM");
  if (roles.isPlayer) roleList.push("PLAYER");
  return roleList.join(" + ");
}

function getRoleBadgeClass(roles: CampaignRoles): string {
  const primaryRole = getPrimaryRole(roles);
  if (primaryRole === "admin") {
    return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400";
  }
  if (primaryRole === "gm") {
    return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400";
  }
  return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400";
}

function CharacterList({
  campaign,
  onViewCampaign,
  onDeleteCharacter,
}: CharacterListProps) {
  const { characters, loading, error } = useCampaignCharacters(campaign.id);

  if (loading) {
    return (
      <div className="animate-pulse p-4">
        <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600 dark:text-red-400">
        Error loading characters: {error}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
            {campaign.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {characters.length} character(s)
          </p>
        </div>
        {campaign.userRoles && (
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeClass(campaign.userRoles)}`}
          >
            {rolesToDisplayString(campaign.userRoles)}
          </span>
        )}
      </div>

      {characters.length === 0 ? (
        <div className="text-center py-6">
          <Users className="w-8 h-8 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No characters in this campaign yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {characters.map((character) => (
            <div
              key={character.id}
              className="flex items-center justify-between p-3 border border-gray-200 dark:border-zinc-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
            >
              <div className="flex-grow">
                <h4 className="font-medium text-gray-900 dark:text-zinc-50">
                  {character.displayName}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Player: {character.playerName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => onViewCampaign(campaign.id)}
                  title="View character details in campaign"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  title="Delete character"
                  onClick={() =>
                    onDeleteCharacter(
                      character.id,
                      character.displayName,
                      campaign.id
                    )
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={() => onViewCampaign(campaign.id)}
          className="flex items-center gap-2 flex-1"
        >
          <Users className="w-4 h-4" />
          Manage in Campaign
        </Button>
      </div>
    </div>
  );
}

interface StandaloneCharactersSectionProps {
  campaigns: CampaignWithMeta[];
  onShowAssignment: () => void;
}

function StandaloneCharactersSection({
  campaigns,
  onShowAssignment,
}: StandaloneCharactersSectionProps) {
  const { user } = useAuth();
  const { characters, loading, error, refreshCharacters } =
    useStandaloneCharacters(user?.id);

  // Filter campaigns where user can assign characters (admin or player)
  const eligibleCampaigns = campaigns.filter(
    (campaign) => campaign.userRoles.isAdmin || campaign.userRoles.isPlayer
  );

  if (loading) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-50 mb-4">
          Your Standalone Characters
        </h3>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-50 mb-4">
          Your Standalone Characters
        </h3>
        <div className="text-red-600 dark:text-red-400 text-sm">
          Error loading characters: {error}
          <Button
            onClick={refreshCharacters}
            variant="ghost"
            size="sm"
            className="ml-2"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
          Your Standalone Characters
        </h3>
        {characters.length > 0 && eligibleCampaigns.length > 0 && (
          <Button
            onClick={onShowAssignment}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Assign to Campaigns
          </Button>
        )}
      </div>

      {characters.length === 0 ? (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <Users className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className="text-sm">No standalone characters yet.</p>
          <p className="text-xs mt-1">
            Characters created outside of campaigns will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <div
              key={character.id}
              className="border rounded-lg p-3 bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700"
            >
              <div className="font-medium text-gray-900 dark:text-zinc-50 text-sm mb-1">
                {character.displayName}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Player: {character.playerName}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Character: {character.characterName}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Available for assignment
              </div>
            </div>
          ))}
        </div>
      )}

      {characters.length > 0 && eligibleCampaigns.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
          <p className="text-amber-600 dark:text-amber-400 text-sm">
            You have {characters.length} standalone character(s), but you're not
            a member of any campaigns where you can assign them.
          </p>
        </div>
      )}
    </div>
  );
}

export default function CharacterManagementContent({
  campaigns,
  onViewCampaign,
}: CharacterManagementContentProps) {
  const { user } = useAuth();
  const [showCreateCharacterModal, setShowCreateCharacterModal] =
    useState(false);
  const [selectedCampaignForCharacter, setSelectedCampaignForCharacter] =
    useState<string>("");
  const [playerName, setPlayerName] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [creatingCharacter, setCreatingCharacter] = useState(false);
  const [characterError, setCharacterError] = useState<string | null>(null);

  // Delete character state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<{
    id: string;
    name: string;
    campaignId: string;
  } | null>(null);
  const [deletingCharacter, setDeletingCharacter] = useState(false);

  // Assignment modal state
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  // Get characters hook for the selected campaign (only when needed)
  const { createCharacter } = useCampaignCharacters(
    selectedCampaignForCharacter || ""
  );

  // Get delete function for character being deleted
  const { deleteCharacter } = useCampaignCharacters(
    characterToDelete?.campaignId || ""
  );

  // Get campaigns that have characters
  const campaignsWithCharacters = campaigns.filter(
    (campaign) => campaign.memberCount && campaign.memberCount > 0
  );

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !playerName.trim() ||
      !characterName.trim() ||
      !selectedCampaignForCharacter
    ) {
      return;
    }

    try {
      setCreatingCharacter(true);
      setCharacterError(null);

      // We need to get the user ID - for now, we'll pass an empty string and handle it in the hook
      const result = await createCharacter(
        playerName.trim(),
        characterName.trim(),
        "" // User ID will be handled by the hook
      );

      if (result.success) {
        setPlayerName("");
        setCharacterName("");
        setSelectedCampaignForCharacter("");
        setShowCreateCharacterModal(false);
      } else {
        setCharacterError(result.error || "Failed to create character");
      }
    } finally {
      setCreatingCharacter(false);
    }
  };

  const handleDeleteCharacter = (
    characterId: string,
    characterName: string,
    campaignId: string
  ) => {
    setCharacterToDelete({
      id: characterId,
      name: characterName,
      campaignId,
    });
    setShowDeleteModal(true);
  };

  const confirmDeleteCharacter = async () => {
    if (!characterToDelete || !user) return;

    try {
      setDeletingCharacter(true);
      const result = await deleteCharacter(characterToDelete.id, user.id);

      if (result.success) {
        setShowDeleteModal(false);
        setCharacterToDelete(null);
      } else {
        setCharacterError(result.error || "Failed to delete character");
      }
    } finally {
      setDeletingCharacter(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Character Statistics */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-50 mb-4">
          Character Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {campaigns.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total Campaigns
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {campaignsWithCharacters.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Campaigns with Characters
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {campaignsWithCharacters.reduce(
                (total, campaign) => total + (campaign.memberCount || 0),
                0
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total Characters
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-50 mb-4">
          Quick Actions
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Button
            onClick={() => setShowCreateCharacterModal(true)}
            disabled={campaigns.length === 0}
            className="flex items-center gap-2 justify-center"
          >
            <UserPlus className="w-4 h-4" />
            Create New Character
          </Button>
          <Button
            disabled
            title="Coming soon"
            className="flex items-center gap-2 justify-center"
          >
            <Edit3 className="w-4 h-4" />
            Bulk Character Actions
          </Button>
        </div>
        {campaigns.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Create a campaign first before adding characters.
          </p>
        )}
      </div>

      {/* Standalone Characters */}
      <StandaloneCharactersSection
        campaigns={campaigns}
        onShowAssignment={() => setShowAssignmentModal(true)}
      />

      {/* Characters by Campaign */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-50 mb-4">
          Characters by Campaign
        </h3>
        {campaignsWithCharacters.length === 0 ? (
          <div className="card text-center py-8">
            <Users className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-zinc-50 mb-2">
              No Characters Yet
            </h4>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create your first character to get started with your campaigns.
            </p>
            <Button
              onClick={() => setShowCreateCharacterModal(true)}
              disabled={campaigns.length === 0}
              className="flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Create Character
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {campaignsWithCharacters.map((campaign) => (
              <CharacterList
                key={campaign.id}
                campaign={campaign}
                onViewCampaign={onViewCampaign}
                onDeleteCharacter={handleDeleteCharacter}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Character Modal */}
      <Modal
        isOpen={showCreateCharacterModal}
        onClose={() => setShowCreateCharacterModal(false)}
        title="Create New Character"
      >
        <form onSubmit={handleCreateCharacter} className="space-y-4">
          {characterError && (
            <div className="p-3 text-sm text-red-800 bg-red-100 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md">
              {characterError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Campaign
            </label>
            <select
              value={selectedCampaignForCharacter}
              onChange={(e) => setSelectedCampaignForCharacter(e.target.value)}
              className="input w-full"
              required
            >
              <option value="">Select a campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>

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

          <ModalFooter
            onCancel={() => setShowCreateCharacterModal(false)}
            cancelText="Cancel"
            confirmText={creatingCharacter ? "Creating..." : "Create"}
            confirmDisabled={
              creatingCharacter ||
              !playerName.trim() ||
              !characterName.trim() ||
              !selectedCampaignForCharacter
            }
            confirmType="submit"
            isLoading={creatingCharacter}
          />
        </form>
      </Modal>

      {/* Delete Character Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Character"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-50 mb-2">
                Delete "{characterToDelete?.name}"?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This action cannot be undone. The character and all associated
                data will be permanently deleted.
              </p>
            </div>
          </div>

          <ModalFooter
            onCancel={() => setShowDeleteModal(false)}
            cancelText="Cancel"
            confirmText={deletingCharacter ? "Deleting..." : "Delete"}
            confirmDisabled={deletingCharacter}
            onConfirm={confirmDeleteCharacter}
            confirmVariant="danger"
            isLoading={deletingCharacter}
          />
        </div>
      </Modal>

      {/* Character Campaign Assignment Modal */}
      <CharacterCampaignAssignment
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        campaigns={campaigns}
        onAssignmentComplete={() => {
          // This will trigger a refresh of the standalone characters section
          window.location.reload();
        }}
      />
    </div>
  );
}
