import { useState } from "react";
import { Edit3, Trash2, Users, UserPlus } from "lucide-react";
import type { Database } from "../../infrastructure/types/supabase";
import { Button } from "./Button";
import { Modal, ModalFooter } from "./Modal";

type Campaign = Database["public"]["Tables"]["campaigns"]["Row"] & {
  role?: string;
  member_count?: number;
};

interface CampaignMember {
  id: string;
  user_id: string;
  role: string;
  user_profiles: {
    email: string;
    display_name: string | null;
  };
}

interface CampaignSettingsContentProps {
  campaign: Campaign;
  onUpdateCampaign: (
    campaignId: string,
    updates: { name?: string; description?: string | null }
  ) => Promise<void>;
  onDeleteCampaign: (campaignId: string) => Promise<void>;
  onGetMembers: (campaignId: string) => Promise<CampaignMember[] | undefined>;
  onAddMember: (
    campaignId: string,
    email: string,
    role: string
  ) => Promise<{ success: boolean; error?: string }>;
  onRemoveMember: (campaignId: string, userId: string) => Promise<void>;
  onClose?: () => void;
}

export default function CampaignSettingsContent({
  campaign,
  onUpdateCampaign,
  onDeleteCampaign,
  onGetMembers,
  onAddMember,
  onRemoveMember,
  onClose,
}: CampaignSettingsContentProps) {
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [members, setMembers] = useState<CampaignMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  const [editName, setEditName] = useState(campaign.name);
  const [editDescription, setEditDescription] = useState(
    campaign.description || ""
  );
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Add member form state
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"admin" | "gm" | "player">(
    "player"
  );
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      setUpdating(true);
      await onUpdateCampaign(campaign.id, {
        name: editName,
        description: editDescription || null,
      });
      setShowEditForm(false);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await onDeleteCampaign(campaign.id);
      setShowDeleteConfirm(false);
      onClose?.();
    } finally {
      setDeleting(false);
    }
  };

  const handleShowMembers = async () => {
    try {
      setLoadingMembers(true);
      const memberData = await onGetMembers(campaign.id);
      if (memberData) {
        setMembers(memberData);
      }
      setShowMembers(true);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;

    setAddingMember(true);
    setAddMemberError(null);

    try {
      const result = await onAddMember(
        campaign.id,
        newMemberEmail.trim(),
        newMemberRole
      );

      if (result.success) {
        // Refresh member list
        const memberData = await onGetMembers(campaign.id);
        if (memberData) {
          setMembers(memberData);
        }
        // Reset form
        setNewMemberEmail("");
        setNewMemberRole("player");
        setShowAddMember(false);
      } else {
        setAddMemberError(result.error || "Failed to add member");
      }
    } catch (error) {
      setAddMemberError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setAddingMember(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Campaign Information */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-50 mb-4">
          Campaign Information
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <p className="text-gray-900 dark:text-zinc-50">{campaign.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <p className="text-gray-600 dark:text-gray-400">
              {campaign.description || "No description provided"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Members
            </label>
            <p className="text-gray-900 dark:text-zinc-50">
              {campaign.member_count || 0} member(s)
            </p>
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
            onClick={() => setShowEditForm(true)}
            className="flex items-center gap-2 justify-center"
          >
            <Edit3 className="w-4 h-4" />
            Edit Campaign
          </Button>

          <Button
            onClick={handleShowMembers}
            disabled={loadingMembers}
            className="flex items-center gap-2 justify-center"
          >
            <Users className="w-4 h-4" />
            {loadingMembers ? "Loading..." : "Manage Members"}
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-200 dark:border-red-800">
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
          Danger Zone
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Permanently delete this campaign and all its data. This action cannot
          be undone.
        </p>
        <Button
          onClick={() => setShowDeleteConfirm(true)}
          variant="danger"
          className="flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Campaign
        </Button>
      </div>

      {/* Edit Campaign Modal */}
      <Modal
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        title="Edit Campaign"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Campaign Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="input w-full"
              placeholder="Enter campaign name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (optional)
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="input w-full"
              rows={3}
              placeholder="Describe your campaign"
            />
          </div>

          <ModalFooter
            onCancel={() => setShowEditForm(false)}
            cancelText="Cancel"
            confirmText={updating ? "Updating..." : "Update"}
            confirmDisabled={updating || !editName.trim()}
            confirmType="submit"
            isLoading={updating}
          />
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Campaign"
      >
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete "{campaign.name}"? This action cannot
          be undone and will remove all campaign data and members.
        </p>

        <ModalFooter
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          cancelText="Cancel"
          confirmText={deleting ? "Deleting..." : "Delete"}
          confirmVariant="danger"
          isLoading={deleting}
        />
      </Modal>

      {/* Members Management Modal */}
      <Modal
        isOpen={showMembers}
        onClose={() => setShowMembers(false)}
        title="Campaign Members"
        maxWidth="lg"
      >
        <div className="space-y-4">
          {members.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No members found or unable to load members.
            </p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-zinc-700 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-zinc-50">
                      {member.user_profiles.display_name || "No Name"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {member.user_profiles.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full">
                      {member.role}
                    </span>
                    {member.role !== "admin" && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          onRemoveMember(campaign.id, member.user_id)
                        }
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-zinc-700">
            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => setShowAddMember(true)}
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMember}
        onClose={() => {
          setShowAddMember(false);
          setNewMemberEmail("");
          setNewMemberRole("player");
          setAddMemberError(null);
        }}
        title="Add Campaign Member"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              className="input w-full"
              placeholder="Enter member's email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <select
              value={newMemberRole}
              onChange={(e) =>
                setNewMemberRole(e.target.value as "admin" | "gm" | "player")
              }
              className="input w-full"
            >
              <option value="player">Player</option>
              <option value="gm">Game Master (GM)</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {addMemberError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                {addMemberError}
              </p>
            </div>
          )}

          <ModalFooter
            onCancel={() => {
              setShowAddMember(false);
              setNewMemberEmail("");
              setNewMemberRole("player");
              setAddMemberError(null);
            }}
            cancelText="Cancel"
            confirmText={addingMember ? "Adding..." : "Add Member"}
            confirmDisabled={addingMember || !newMemberEmail.trim()}
            confirmType="submit"
            isLoading={addingMember}
          />
        </form>
      </Modal>
    </div>
  );
}
