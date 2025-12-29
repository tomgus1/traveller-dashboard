import { useState } from "react";
import { useCampaignCharacters } from "../hooks/useCampaignCharacters";
import { useAuth } from "../hooks/useAuth";
import { UserPlus, Trash2 } from "lucide-react";
import { Button } from "./Button";
import { Modal, ModalFooter } from "./Modal";
import FormField from "./FormField";
import type { CampaignWithMeta } from "../../core/entities";
import { CharacterCampaignAssignment } from "./CharacterCampaignAssignment";
import { CharacterList } from "./CharacterList";
import { StandaloneCharactersSection } from "./StandaloneCharactersSection";

interface CharacterManagementContentProps {
  campaigns: CampaignWithMeta[];
  onViewCampaign: (campaignId: string) => void;
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

  // Delete character state (Moved to sub-components where possible, but kept here for campaigns)
  // Actually, CharacterList handles delete callback, but the logic was here. 
  // Let's refactor proper handling. 
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<{
    id: string;
    name: string;
    campaignId: string;
  } | null>(null);
  const [deletingCharacter, setDeletingCharacter] = useState(false);

  // Assignment modal state
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  // Get characters hook for the selected campaign (only when needed for creation)
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

      // User ID will be handled by the hook usually, but createCharacter signature takes userId?
      // useCampaignCharacters createCharacter takes (playerName, characterName, userId)
      if (!user) return;

      const result = await createCharacter(
        playerName.trim(),
        characterName.trim(),
        user.id
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
      <div className="card-mgt bg-side p-4 border border-border">
        <h3 className="text-xs font-black uppercase tracking-widest text-text-main mb-4 border-b border-border pb-2">
          OVERVIEW // STATS
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-black text-primary">
              {campaigns.length}
            </div>
            <div className="text-[10px] font-bold text-muted uppercase tracking-wider">
              Total Campaigns
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-text-main">
              {campaignsWithCharacters.length}
            </div>
            <div className="text-[10px] font-bold text-muted uppercase tracking-wider">
              Active Deployments
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-secondary">
              {campaignsWithCharacters.reduce(
                (total, campaign) => total + (campaign.memberCount || 0),
                0
              )}
            </div>
            <div className="text-[10px] font-bold text-muted uppercase tracking-wider">
              Total Personnel
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card-mgt hud-frame p-6">
        <div className="mgt-header-bar -mx-6 -mt-6 mb-6">
          <span className="text-xs">COMMAND ACTIONS</span>
          <span className="text-[8px] opacity-60 px-1 border border-white/20">CMD // EXE</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Button
            onClick={() => setShowCreateCharacterModal(true)}
            disabled={campaigns.length === 0}
            className="flex items-center gap-2 justify-center py-4"
          >
            <UserPlus className="w-4 h-4" />
            Create New Personnel File
          </Button>
          <Button
            disabled
            title="Module Upgrade Required"
            className="flex items-center gap-2 justify-center opacity-50 cursor-not-allowed py-4"
          >
            <UserPlus className="w-4 h-4" />
            Bulk Import (Disabled)
          </Button>
        </div>
        {campaigns.length === 0 && (
          <p className="text-[10px] text-accent font-bold uppercase tracking-widest mt-4 text-center border p-2 border-accent/20 bg-accent/5">
            INIT_ERROR: No active campaigns detected. Create a campaign to unlock personnel management.
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
        <div className="mgt-header-bar mb-6">
          <span className="text-xs">DEPLOYMENT MANIFEST</span>
          <div className="w-2 h-2 bg-primary animate-pulse" />
        </div>

        {campaignsWithCharacters.length === 0 ? (
          <div className="card-mgt hud-frame p-12 text-center bg-card/50">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-2 border-dashed border-border rounded-full flex items-center justify-center mb-4">
                <UserPlus className="w-6 h-6 text-muted" />
              </div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-main mb-2">
                Manifest Empty
              </h4>
              <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-6 max-w-xs">
                No personnel currently assigned to active campaigns.
              </p>
              <Button
                onClick={() => setShowCreateCharacterModal(true)}
                disabled={campaigns.length === 0}
                className="flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                INITIATE CONSCRIPTION
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
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
        title="Create New Personnel File"
      >
        <form onSubmit={handleCreateCharacter} className="space-y-4">
          {characterError && (
            <div className="p-3 border border-accent bg-accent/5 text-accent text-[10px] font-black uppercase tracking-widest">
              ERROR: {characterError}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase tracking-wider text-muted">
              Assignment Target (Campaign)
            </label>
            <select
              value={selectedCampaignForCharacter}
              onChange={(e) => setSelectedCampaignForCharacter(e.target.value)}
              className="w-full bg-surface-low border border-border text-text-main text-xs p-2 focus:border-primary focus:outline-none rounded-[2px]"
              required
            >
              <option value="">SELECT CAMPAIGN...</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <FormField
            label="Player Name (DNA Source)"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="ENTER PLAYER NAME"
            required
          />

          <FormField
            label="Character Name (Designation)"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder="ENTER CHARACTER NAME"
            required
          />

          <ModalFooter
            onCancel={() => setShowCreateCharacterModal(false)}
            cancelText="ABORT"
            confirmText={creatingCharacter ? "PROCESSING..." : "CONFIRM ENTRY"}
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
        title="CONFIRM DISCHARGE"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-4 bg-accent/5 border border-accent/20">
            <div className="flex-shrink-0">
              <Trash2 className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-grow">
              <h3 className="text-sm font-black uppercase tracking-wider text-text-main mb-2">
                Discharge "{characterToDelete?.name}"?
              </h3>
              <p className="text-[10px] text-muted font-bold uppercase tracking-widest">
                WARNING: This action is irreversible. All service records and data will be expunged.
              </p>
            </div>
          </div>

          <ModalFooter
            onCancel={() => setShowDeleteModal(false)}
            cancelText="CANCEL"
            confirmText={deletingCharacter ? "PURGING..." : "CONFIRM DISCHARGE"}
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
