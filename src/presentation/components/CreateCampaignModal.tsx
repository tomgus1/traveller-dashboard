import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { Button } from "./Button";
import { Modal, ModalFooter } from "./Modal";
import FormField from "./FormField";
import type { CampaignRole, CreateCampaignRequest } from "../../core/entities";

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCampaign: (
    request: CreateCampaignRequest
  ) => Promise<{ success: boolean; error?: string }>;
}

export default function CreateCampaignModal({
  isOpen,
  onClose,
  onCreateCampaign,
}: CreateCampaignModalProps) {
  // Basic campaign info
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [creatorIsAlsoGM, setCreatorIsAlsoGM] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Initial members
  const [initialMembers, setInitialMembers] = useState<
    Array<{ email: string; role: CampaignRole }>
  >([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<CampaignRole>("player");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) return;

    try {
      setIsCreating(true);
      const result = await onCreateCampaign({
        name: campaignName.trim(),
        description: campaignDescription.trim() || undefined,
        creatorIsAlsoGM,
        initialMembers: initialMembers.length > 0 ? initialMembers : undefined,
      });

      // Only reset form and close modal if successful
      if (result.success) {
        setCampaignName("");
        setCampaignDescription("");
        setCreatorIsAlsoGM(false);
        setInitialMembers([]);
        setNewMemberEmail("");
        setNewMemberRole("player");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const addMember = () => {
    if (!newMemberEmail.trim()) return;

    // Check if member already exists
    if (
      initialMembers.some(
        (member) => member.email.toLowerCase() === newMemberEmail.toLowerCase()
      )
    ) {
      return;
    }

    setInitialMembers([
      ...initialMembers,
      {
        email: newMemberEmail.trim(),
        role: newMemberRole,
      },
    ]);
    setNewMemberEmail("");
    setNewMemberRole("player");
  };

  const removeMember = (index: number) => {
    setInitialMembers(initialMembers.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    // Reset form when closing
    setCampaignName("");
    setCampaignDescription("");
    setCreatorIsAlsoGM(false);
    setInitialMembers([]);
    setNewMemberEmail("");
    setNewMemberRole("player");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Campaign"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Campaign Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-50">
            Campaign Information
          </h3>

          <FormField
            label="Campaign Name"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Enter campaign name"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (optional)
            </label>
            <textarea
              value={campaignDescription}
              onChange={(e) => setCampaignDescription(e.target.value)}
              className="input w-full"
              rows={3}
              placeholder="Describe your campaign"
            />
          </div>

          <div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="creatorIsAlsoGM"
                checked={creatorIsAlsoGM}
                onChange={(e) => setCreatorIsAlsoGM(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="creatorIsAlsoGM"
                className="ml-2 text-sm text-gray-700 dark:text-gray-300"
              >
                Also be the Game Master
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              You will always be an Administrator with full campaign control.
              Check this if you also want to run the game as GM.
            </p>
          </div>
        </div>

        {/* Initial Members */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-50">
            Invite Players (Optional)
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add players to your campaign. They'll need to have accounts to join.
          </p>

          {/* Add Member Form */}
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="player@example.com"
                className="input w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMember();
                  }
                }}
              />
            </div>
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value as CampaignRole)}
              className="input"
            >
              <option value="player">Player</option>
              <option value="gm">GM</option>
              <option value="admin">Admin</option>
            </select>
            <Button
              type="button"
              onClick={addMember}
              disabled={!newMemberEmail.trim()}
              size="sm"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>

          {/* Members List */}
          {initialMembers.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Initial Members ({initialMembers.length})
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {initialMembers.map((member, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-zinc-800 "
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-900 dark:text-zinc-50">
                        {member.email}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 ">
                        {member.role}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMember(index)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <ModalFooter
          onCancel={handleClose}
          cancelText="Cancel"
          confirmText={isCreating ? "Creating..." : "Create Campaign"}
          confirmDisabled={isCreating || !campaignName.trim()}
          confirmType="submit"
          isLoading={isCreating}
        />
      </form>
    </Modal>
  );
}
