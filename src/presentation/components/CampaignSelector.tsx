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
    <div className="min-h-screen bg-transparent relative">
      <div className="scanlines" />

      {/* Header */}
      <div className="sticky top-0 z-50 bg-side border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary border border-primary/40 flex items-center justify-center shrink-0">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase text-white leading-none">
                Campaign Selection
              </h1>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                Subspace Relay // Active Node: DASH-01
              </p>
            </div>
          </div>
          <Button onClick={signOut} variant="outline" size="sm">Disconnect Link</Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          {campaigns.length === 0 ? (
            <div className="card-mgt hud-frame text-center py-20 bg-card/80 backdrop-blur-md">
              <div className="text-primary mb-6">
                <Rocket className="w-20 h-20 mx-auto animate-pulse" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-widest text-text-main mb-2">
                No active sectors detected
              </h3>
              <p className="text-xs font-bold text-muted uppercase tracking-widest mb-8">
                Initialize new deployment to begin operations
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                variant="premium"
              >
                INITIALIZE CAMPAIGN
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center justify-between mgt-header-bar px-6 py-3">
                <h2 className="text-xs font-black tracking-[0.3em]">
                  Stellar Operations Log
                </h2>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  variant="primary"
                  size="sm"
                >
                  NEW DEPLOYMENT
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="card-mgt hud-frame relative bg-card/80 backdrop-blur-md group hover:border-primary transition-all duration-300">
                    <div className="absolute top-0 right-0 p-2 opacity-40 group-hover:opacity-100 transition-opacity">
                      {campaign.userRoles?.isAdmin && (
                        <CampaignSettings
                          campaign={convertToLegacyCampaign(campaign)}
                          onUpdateCampaign={adaptedUpdateCampaign}
                          onDeleteCampaign={adaptedDeleteCampaign}
                          onGetMembers={adaptedGetMembers}
                          onRemoveMember={adaptedRemoveMember}
                          onUpdateMemberRole={adaptedUpdateMemberRole}
                        />
                      )}
                    </div>

                    <div
                      className="cursor-pointer pt-4"
                      onClick={() => onCampaignSelect(campaign.id)}
                    >
                      <div className="mb-4">
                        <div className="flex items-baseline justify-between gap-2 mb-2">
                          <h3 className="text-lg font-black uppercase tracking-tighter text-text-main truncate">
                            {campaign.name}
                          </h3>
                        </div>
                        {campaign.userRoles && (
                          <div className="flex gap-2">
                            <span
                              className={`px-2 py-0.5 text-[8px] font-black uppercase border border-current ${getRoleBadge(campaign.userRoles)}`}
                            >
                              {rolesToDisplayString(campaign.userRoles)}
                            </span>
                          </div>
                        )}
                      </div>

                      {campaign.description && (
                        <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-6 line-clamp-3 leading-relaxed opacity-80">
                          {campaign.description}
                        </p>
                      )}

                      <div className="border-t border-border pt-4 mt-auto flex justify-between items-center text-[8px] font-black uppercase tracking-[0.2em] text-muted">
                        <span>Personnel: {campaign.memberCount || 0}</span>
                        <span>
                          Synced: {campaign.createdAt.toLocaleDateString()}
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
