import { useState } from "react";
import { Settings, Edit3, Trash2, UserPlus, Users, X } from "lucide-react";
import type { Database } from "../types/supabase";

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

  const isAdmin = campaign.role === "admin";

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
      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-zinc-50">
              Edit Campaign
            </h3>

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

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="btn flex-1 justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || !editName.trim()}
                  className="btn flex-1 justify-center bg-blue-600 hover:bg-blue-700 text-white border-blue-600 disabled:opacity-50"
                >
                  {updating ? "Updating..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-zinc-50">
              Delete Campaign
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{campaign.name}"? This action
              cannot be undone and will remove all campaign data and members.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="btn flex-1 justify-center disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn flex-1 justify-center bg-red-600 hover:bg-red-700 text-white border-red-600 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members Management Modal */}
      {showMembers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                Campaign Members
              </h3>
              <button onClick={() => setShowMembers(false)} className="btn p-2">
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="card flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-zinc-50">
                      {member.user_profiles.display_name ||
                        member.user_profiles.email}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {member.user_profiles.email}
                    </p>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${(() => {
                        if (member.role === "admin") {
                          return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400";
                        }
                        if (member.role === "gm") {
                          return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400";
                        }
                        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400";
                      })()}`}
                    >
                      {member.role.toUpperCase()}
                    </span>
                  </div>

                  {member.role !== "admin" && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="btn p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {members.length === 0 && (
                <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                  No members found
                </p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
              <button
                className="btn w-full justify-center bg-blue-600 hover:bg-blue-700 text-white border-blue-600 disabled:opacity-50"
                disabled
                title="Feature coming soon"
              >
                <UserPlus className="w-4 h-4" />
                Add Member (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
