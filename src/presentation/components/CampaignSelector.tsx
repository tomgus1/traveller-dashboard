import { useState } from "react";
import { Rocket } from "lucide-react";
import { useCampaigns } from "../hooks/useCampaigns";
import { useCampaignMembers } from "../hooks/useCampaignMembers";
import { useAuth } from "../hooks/useAuth";
import CampaignSettings from "./CampaignSettings";
import { Button } from "./Button";
import { Modal, ModalFooter } from "./Modal";
import { LoadingScreen } from "./Loading";
import type { CampaignWithMeta, CampaignRoles } from "../../core/entities";
import type { Database } from "../../infrastructure/types/supabase";

// Convert our new entity to legacy interface for CampaignSettings
const convertToLegacyCampaign = (
  campaign: CampaignWithMeta
): Database["public"]["Tables"]["campaigns"]["Row"] & {
  userRoles?: CampaignRoles;
  member_count?: number;
} => ({
  id: campaign.id,
  name: campaign.name,
  description: campaign.description || null,
  created_by: campaign.createdBy,
  created_at: campaign.createdAt.toISOString(),
  updated_at: campaign.updatedAt.toISOString(),
  userRoles: campaign.userRoles,
  member_count: campaign.memberCount,
});

interface CampaignSelectorProps {
  onCampaignSelect: (campaignId: string) => void;
}

export default function CampaignSelector({
  onCampaignSelect,
}: CampaignSelectorProps) {
  const {
    campaigns,
    loading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
  } = useCampaigns();
  const { fetchMembers, removeMember, updateMemberRole } = useCampaignMembers();
  const { signOut } = useAuth();

  // Adapter functions to make new services work with legacy component interfaces
  const adaptedUpdateCampaign = async (
    campaignId: string,
    updates: { name?: string; description?: string | null }
  ) => {
    await updateCampaign(campaignId, {
      name: updates.name,
      description:
        updates.description === null ? undefined : updates.description,
    });
  };

  const adaptedDeleteCampaign = async (campaignId: string) => {
    await deleteCampaign(campaignId);
  };

  const adaptedGetMembers = async (campaignId: string) => {
    const result = await fetchMembers(campaignId);
    if (result.success && result.data) {
      // Convert MemberInfo[] to legacy format
      return result.data.map((member) => ({
        id: member.id,
        user_id: member.userId,
        roles: member.roles,
        user_profiles: {
          email: member.email,
          display_name: member.displayName || null,
          username: member.username || null,
        },
      }));
    }
    return undefined;
  };

  const adaptedRemoveMember = async (campaignId: string, userId: string) => {
    await removeMember(campaignId, userId);
  };

  const adaptedUpdateMemberRole = async (
    campaignId: string,
    userId: string,
    roles: CampaignRoles
  ) => {
    return await updateMemberRole(campaignId, userId, roles);
  };

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignDescription, setNewCampaignDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    try {
      setCreating(true);
      const result = await createCampaign({
        name: newCampaignName,
        description: newCampaignDescription || undefined,
      });

      if (result.success) {
        setNewCampaignName("");
        setNewCampaignDescription("");
        setShowCreateForm(false);
      }
      // Error will be handled by the useCampaigns hook and displayed in the form
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to create campaign:", error);
    } finally {
      setCreating(false);
    }
  };

  // Helper function to get primary role for display purposes
  const getPrimaryRole = (roles: CampaignRoles): string => {
    if (roles.isAdmin) return "admin";
    if (roles.isGm) return "gm";
    if (roles.isPlayer) return "player";
    return "unknown";
  };

  // Helper function to convert roles to display string
  const rolesToDisplayString = (roles: CampaignRoles): string => {
    const roleList = [];
    if (roles.isAdmin) roleList.push("ADMIN");
    if (roles.isGm) roleList.push("GM");
    if (roles.isPlayer) roleList.push("PLAYER");
    return roleList.join(" + ");
  };

  const getRoleBadge = (roles: CampaignRoles) => {
    const primaryRole = getPrimaryRole(roles);
    const colors = {
      admin: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400",
      gm: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400",
      player:
        "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400",
    };
    return (
      colors[primaryRole as keyof typeof colors] ||
      "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400"
    );
  };

  if (loading) {
    return <LoadingScreen message="Loading campaigns..." />;
  }

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <div className="glass sticky top-0 z-50 px-4 py-4 border-b">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Campaign Selection
            </h1>
            <p className="text-sm text-muted">
              Choose a campaign to manage or create a new one
            </p>
          </div>
          <Button onClick={signOut} variant="outline">Sign Out</Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        <div className="max-w-4xl mx-auto">
          {campaigns.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <Rocket className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-50 mb-2">
                No campaigns yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Create your first campaign to get started
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
              >
                Create Campaign
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black tracking-tighter uppercase">
                  Your Campaigns
                </h2>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  variant="primary"
                >
                  Create New Campaign
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="card-modern relative">
                    {/* Settings button for admins */}
                    {campaign.userRoles?.isAdmin && (
                      <div className="absolute top-4 right-4">
                        <CampaignSettings
                          campaign={convertToLegacyCampaign(campaign)}
                          onUpdateCampaign={adaptedUpdateCampaign}
                          onDeleteCampaign={adaptedDeleteCampaign}
                          onGetMembers={adaptedGetMembers}
                          onRemoveMember={adaptedRemoveMember}
                          onUpdateMemberRole={adaptedUpdateMemberRole}
                        />
                      </div>
                    )}

                    {/* Campaign card content - clickable area */}
                    <div
                      className="cursor-pointer"
                      onClick={() => onCampaignSelect(campaign.id)}
                    >
                      <div className="flex justify-between items-start mb-3 pr-8">
                        <h3 className="text-lg font-bold tracking-tight truncate">
                          {campaign.name}
                        </h3>
                        {campaign.userRoles && (
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadge(campaign.userRoles)}`}
                          >
                            {rolesToDisplayString(campaign.userRoles)}
                          </span>
                        )}
                      </div>

                      {campaign.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                          {campaign.description}
                        </p>
                      )}

                      <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                        <span>{campaign.memberCount || 0} member(s)</span>
                        <span>
                          Created {campaign.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Campaign Modal */}
      {/* Create Campaign Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Create New Campaign"
      >
        <form onSubmit={handleCreateCampaign} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-800 bg-red-100 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Campaign Name *
            </label>
            <input
              type="text"
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
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
              value={newCampaignDescription}
              onChange={(e) => setNewCampaignDescription(e.target.value)}
              className="input w-full"
              rows={3}
              placeholder="Describe your campaign"
            />
          </div>

          <ModalFooter
            onCancel={() => setShowCreateForm(false)}
            cancelText="Cancel"
            confirmText={creating ? "Creating..." : "Create"}
            confirmDisabled={creating || !newCampaignName.trim()}
            confirmType="submit"
            isLoading={creating}
          />
        </form>
      </Modal>
    </div>
  );
}
