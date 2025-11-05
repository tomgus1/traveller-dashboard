import { useState } from "react";
import { Settings, Edit3, Trash2, UserPlus, Users, X } from "lucide-react";
import type { Database } from "../../infrastructure/types/supabase";
import type { CampaignRoles } from "../../core/entities";
import { Button, IconButton } from "./Button";
import { Modal, ModalFooter } from "./Modal";

type Campaign = Database["public"]["Tables"]["campaigns"]["Row"] & {
  userRoles?: CampaignRoles;
  member_count?: number;
};

interface CampaignMember {
  id: string;
  user_id: string;
  roles: CampaignRoles;
  user_profiles: {
    email: string;
    display_name: string | null;
    username: string | null;
  };
}

interface CampaignSettingsProps {
  campaign: Campaign;
  onUpdateCampaign: (
    campaignId: string,
    updates: { name?: string; description?: string | null }
  ) => Promise<void>;
  onDeleteCampaign: (campaignId: string) => Promise<void>;
  onGetMembers: (campaignId: string) => Promise<CampaignMember[] | undefined>;
  onRemoveMember: (campaignId: string, userId: string) => Promise<void>;
}

export default function CampaignSettings({
  campaign,
  onUpdateCampaign,
  onDeleteCampaign,
  onGetMembers,
  onRemoveMember,
}: CampaignSettingsProps) {
  // Helper function to get role display for a member
  const getRoleDisplay = (roles: CampaignRoles) => {
    const roleList = [];
    if (roles.isAdmin) roleList.push("ADMIN");
    if (roles.isGm) roleList.push("GM");
    if (roles.isPlayer) roleList.push("PLAYER");
    return roleList.join(" + ");
  };

  // Helper function to get role styling
  const getRoleStyles = (roles: CampaignRoles) => {
    if (roles.isAdmin) {
      return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400";
    }
    if (roles.isGm) {
      return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400";
    }
    return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400";
  };
  const [showSettings, setShowSettings] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState<CampaignMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [editName, setEditName] = useState(campaign.name);
  const [editDescription, setEditDescription] = useState(
    campaign.description || ""
  );
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = campaign.userRoles?.isAdmin;

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      setUpdating(true);
      await onUpdateCampaign(campaign.id, {
        name: editName,
        description: editDescription,
      });
      setShowEditForm(false);
      setShowSettings(false);
    } catch {
      // Handle error silently or show user notification
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await onDeleteCampaign(campaign.id);
    } catch {
      // Handle error silently or show user notification
    } finally {
      setDeleting(false);
    }
  };

  const handleShowMembers = async () => {
    try {
      setLoadingMembers(true);
      const memberData = await onGetMembers(campaign.id);
      setMembers(memberData || []);
      setShowMembers(true);
    } catch {
      // Handle error silently or show user notification
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await onRemoveMember(campaign.id, userId);
      // Refresh members list
      const memberData = await onGetMembers(campaign.id);
      setMembers(memberData || []);
    } catch {
      // Handle error silently or show user notification
    }
  };

  if (!isAdmin) {
    return null; // Only show settings to admins
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent campaign selection
          setShowSettings(!showSettings);
        }}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
        title="Campaign Settings"
      >
        <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>

      {showSettings && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSettings(false)}
          />

          {/* Settings Menu */}
          <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg z-50">
            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  setShowEditForm(true);
                  setShowSettings(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit Campaign
              </button>

              <button
                onClick={handleShowMembers}
                disabled={loadingMembers}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-50"
              >
                <Users className="w-4 h-4" />
                {loadingMembers ? "Loading..." : "Manage Members"}
              </button>

              <button
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setShowSettings(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Campaign
              </button>
            </div>
          </div>
        </>
      )}

      {/* Edit Campaign Modal */}
      <Modal
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        title="Edit Campaign"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Campaign Name *
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
      {showMembers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                Campaign Members
              </h3>
              <IconButton
                icon={
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                }
                onClick={() => setShowMembers(false)}
                aria-label="Close"
              />
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {members.map((member) => {
                // Priority: display_name > username > email
                const displayName =
                  member.user_profiles.display_name ||
                  member.user_profiles.username ||
                  member.user_profiles.email;

                // Show username if different from display name, otherwise show email
                const secondaryInfo =
                  member.user_profiles.display_name &&
                  member.user_profiles.username
                    ? `@${member.user_profiles.username}`
                    : member.user_profiles.email;

                return (
                  <div
                    key={member.id}
                    className="card flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-zinc-50">
                        {displayName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {secondaryInfo}
                      </p>
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${getRoleStyles(member.roles)}`}
                      >
                        {getRoleDisplay(member.roles)}
                      </span>
                    </div>

                    {!member.roles.isAdmin && (
                      <IconButton
                        onClick={() => handleRemoveMember(member.user_id)}
                        icon={<Trash2 className="w-4 h-4" />}
                        variant="danger"
                        aria-label="Remove member"
                        title="Remove member"
                      />
                    )}
                  </div>
                );
              })}

              {members.length === 0 && (
                <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                  No members found
                </p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
              <Button
                variant="primary"
                className="w-full justify-center"
                disabled
                title="Feature coming soon"
              >
                <UserPlus className="w-4 h-4" />
                Add Member (Coming Soon)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
