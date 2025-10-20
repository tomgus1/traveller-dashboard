import { useState } from "react";
import { Edit3, Trash2, Users, UserPlus } from "lucide-react";
import type { Database } from "../../infrastructure/types/supabase";
import type { CampaignRoles } from "../../core/entities";
import { Button } from "./Button";
import { Modal, ModalFooter } from "./Modal";
import RoleSelector from "./RoleSelector";
import { rolesToDisplayString } from "../../shared/utils/permissions";

type Campaign = Database["public"]["Tables"]["campaigns"]["Row"] & {
  userRoles?: CampaignRoles;
  member_count?: number;
};

interface CampaignMember {
  id: string;
  user_id?: string;
  userId?: string; // Support both formats
  roles: CampaignRoles;
  email: string;
  displayName?: string;
  user_profiles?: {
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
    roles: CampaignRoles
  ) => Promise<{ success: boolean; error?: string }>;
  onUpdateMemberRole: (
    campaignId: string,
    userId: string,
    roles: CampaignRoles
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
  onUpdateMemberRole,
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
  const [updatingMemberRole, setUpdatingMemberRole] = useState<string | null>(
    null
  );

  const [editName, setEditName] = useState(campaign.name);
  const [editDescription, setEditDescription] = useState(
    campaign.description || ""
  );
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Add member form state
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRoles, setNewMemberRoles] = useState<CampaignRoles>({
    isAdmin: false,
    isGm: false,
    isPlayer: true, // Default to player
  });
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

  const refreshMembers = async () => {
    try {
      const memberData = await onGetMembers(campaign.id);
      if (memberData) {
        setMembers(memberData);
      }
    } catch {
      // Silently handle refresh errors
    }
  };

  const handleShowMembers = async () => {
    // If we already have member data and modal is opening, just show it
    if (members.length > 0 && !showMembers) {
      setShowMembers(true);
      return;
    }

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
        newMemberEmail,
        newMemberRoles
      );

      if (result.success) {
        // Reset form
        setNewMemberEmail("");
        setNewMemberRoles({
          isAdmin: false,
          isGm: false,
          isPlayer: true,
        });
        setShowAddMember(false);
        // Refresh members list
        refreshMembers();
      } else {
        setAddMemberError(result.error || "Failed to add member");
      }
    } catch (error) {
      setAddMemberError(
        error instanceof Error ? error.message : "Failed to add member"
      );
    } finally {
      setAddingMember(false);
    }
  };

  // Member role editing state
  const [editingMember, setEditingMember] = useState<CampaignMember | null>(
    null
  );
  const [editingRoles, setEditingRoles] = useState<CampaignRoles>({
    isAdmin: false,
    isGm: false,
    isPlayer: true,
  });

  const handleUpdateMemberRole = async (newRoles: CampaignRoles) => {
    if (!editingMember) return;

    const userId = editingMember.user_id || editingMember.userId;
    if (!userId) return;

    setUpdatingMemberRole(userId);
    try {
      const result = await onUpdateMemberRole(campaign.id, userId, newRoles);

      if (result.success) {
        // Refresh member list to show updated role
        const memberData = await onGetMembers(campaign.id);
        if (memberData) {
          setMembers(memberData);
        }
        // Close the editing modal
        setEditingMember(null);
      }
    } finally {
      setUpdatingMemberRole(null);
    }
  };

  const openEditMember = (member: CampaignMember) => {
    setEditingMember(member);
    setEditingRoles(member.roles);
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
                      {member.user_profiles?.display_name ||
                        member.displayName ||
                        "No Name"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {member.user_profiles?.email || member.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                        {rolesToDisplayString(member.roles)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditMember(member)}
                      disabled={updatingMemberRole === member.user_id}
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    {updatingMemberRole === member.user_id && (
                      <span className="text-xs text-gray-500">Updating...</span>
                    )}
                    {!member.roles.isAdmin && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          const userId = member.user_id || member.userId;
                          if (userId) {
                            onRemoveMember(campaign.id, userId);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
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
          setNewMemberRoles({
            isAdmin: false,
            isGm: false,
            isPlayer: true,
          });
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
              Roles
            </label>
            <RoleSelector roles={newMemberRoles} onChange={setNewMemberRoles} />
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
              setNewMemberRoles({
                isAdmin: false,
                isGm: false,
                isPlayer: true,
              });
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

      {/* Edit Member Roles Modal */}
      {editingMember && (
        <Modal
          isOpen={!!editingMember}
          onClose={() => setEditingMember(null)}
          title={`Edit Roles - ${editingMember.user_profiles?.display_name || editingMember.displayName || editingMember.user_profiles?.email || editingMember.email}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Member Roles
              </label>
              <RoleSelector
                roles={editingRoles}
                onChange={setEditingRoles}
                disabled={updatingMemberRole === editingMember.user_id}
              />
            </div>

            <ModalFooter
              onCancel={() => setEditingMember(null)}
              cancelText="Cancel"
              confirmText={
                updatingMemberRole === editingMember.user_id
                  ? "Updating..."
                  : "Update Roles"
              }
              confirmDisabled={updatingMemberRole === editingMember.user_id}
              onConfirm={() => handleUpdateMemberRole(editingRoles)}
              isLoading={updatingMemberRole === editingMember.user_id}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
