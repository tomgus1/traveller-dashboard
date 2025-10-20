import { useState } from "react";
import {
  Rocket,
  Plus,
  ChevronRight,
  Edit,
  User,
  Users,
  Settings,
} from "lucide-react";
import { useCampaigns } from "../hooks/useCampaigns";
import { useCampaignCharacters } from "../hooks/useCampaignCharacters";
import { useCampaignMembers } from "../hooks/useCampaignMembers";
import { useAuth } from "../hooks/useAuth";
import { Button } from "./Button";
import { Modal, ModalFooter } from "./Modal";
import { LoadingScreen } from "./Loading";
import FormField from "./FormField";
import CampaignSettingsContent from "./CampaignSettingsContent";
import CharacterManagementContent from "./CharacterManagementContent";
import StandaloneCharacterManagement from "./StandaloneCharacterManagement";
import UserProfileDropdown from "./UserProfileDropdown";
import AccountSettings from "./AccountSettings";
import CreateCampaignModal from "./CreateCampaignModal";
import type {
  CampaignWithMeta,
  CreateCampaignRequest,
  CampaignRoles,
} from "../../core/entities";
import type { Database } from "../../infrastructure/types/supabase";
import { rolesToDisplayString } from "../../shared/utils/permissions";

// Helper function to get primary role for styling (simple backward compatibility)
const getPrimaryRole = (roles: CampaignRoles): string => {
  if (roles.isAdmin) return "admin";
  if (roles.isGm) return "gm";
  return "player";
};

interface MainDashboardProps {
  onCampaignSelect: (campaignId: string) => void;
}

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

interface CampaignCardProps {
  campaign: CampaignWithMeta;
  onSelect: (campaignId: string) => void;
  onEdit: (campaign: CampaignWithMeta) => void;
  onSettings: (campaign: CampaignWithMeta) => void;
}

interface CharacterCardProps {
  campaign: CampaignWithMeta;
  onViewCampaign: (campaignId: string) => void;
}

interface RecentActivityCardProps {
  campaigns: CampaignWithMeta[];
  onCampaignSelect: (campaignId: string) => void;
}

interface CampaignManagementGridProps {
  campaigns: CampaignWithMeta[];
  onSelect: (campaignId: string) => void;
  onEdit: (campaign: CampaignWithMeta) => void;
  onSettings: (campaign: CampaignWithMeta) => void;
}

function getRoleBadgeClass(primaryRole: string): string {
  if (primaryRole === "admin") {
    return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400";
  }
  if (primaryRole === "gm") {
    return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400";
  }
  return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400";
}

function QuickActionCard({
  title,
  description,
  icon,
  onClick,
  disabled,
}: QuickActionCardProps) {
  return (
    <div
      className={`card p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      onClick={disabled ? undefined : onClick}
    >
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0 text-blue-600 dark:text-blue-400">
          {icon}
        </div>
        <div className="flex-grow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-50 mb-1">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {description}
          </p>
        </div>
        <div className="flex-shrink-0 text-gray-400 dark:text-gray-500">
          <Plus className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function RecentActivityCard({
  campaigns,
  onCampaignSelect,
}: RecentActivityCardProps) {
  const recentCampaigns = campaigns
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 3);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
          Recent Campaigns
        </h3>
        {campaigns.length > 3 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {campaigns.length} total
          </span>
        )}
      </div>

      {recentCampaigns.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No campaigns yet. Create your first campaign to get started!
        </p>
      ) : (
        <div className="space-y-3">
          {recentCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors"
              onClick={() => onCampaignSelect(campaign.id)}
            >
              <div className="flex-grow">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-gray-900 dark:text-zinc-50">
                    {campaign.name}
                  </h4>
                  {campaign.userRoles && (
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeClass(getPrimaryRole(campaign.userRoles))}`}
                    >
                      {rolesToDisplayString(campaign.userRoles)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {campaign.memberCount || 0} member(s) • Updated{" "}
                  {campaign.updatedAt.toLocaleDateString()}
                </p>
              </div>
              <div className="text-gray-400 dark:text-gray-500">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({
  campaign,
  onSelect,
  onEdit,
  onSettings,
}: CampaignCardProps) {
  return (
    <div className="card transition-all duration-200 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-50 truncate">
          {campaign.name}
        </h3>
        {campaign.userRoles && (
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeClass(getPrimaryRole(campaign.userRoles))}`}
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

      <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
        <span>{campaign.memberCount || 0} member(s)</span>
        <span>Created {campaign.createdAt.toLocaleDateString()}</span>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onSelect(campaign.id)}
          className="flex-1"
        >
          Enter Campaign
        </Button>
        <Button size="sm" onClick={() => onEdit(campaign)}>
          <Edit className="w-4 h-4" />
        </Button>
        <Button size="sm" onClick={() => onSettings(campaign)}>
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function CharacterCard({ campaign, onViewCampaign }: CharacterCardProps) {
  const { characters, loading } = useCampaignCharacters(campaign.id);

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card transition-all duration-200 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-50 truncate">
          {campaign.name}
        </h3>
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
          {characters.length} CHARACTER{characters.length !== 1 ? "S" : ""}
        </span>
      </div>

      {characters.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
          No characters in this campaign yet.
        </p>
      ) : (
        <div className="mb-4">
          <div className="space-y-2">
            {characters.slice(0, 3).map((character) => (
              <div key={character.id} className="flex items-center text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-gray-900 dark:text-zinc-50 font-medium">
                  {character.characterName || character.displayName}
                </span>
              </div>
            ))}
            {characters.length > 3 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                +{characters.length - 3} more...
              </p>
            )}
          </div>
        </div>
      )}

      <Button
        size="sm"
        onClick={() => onViewCampaign(campaign.id)}
        className="w-full"
      >
        View Campaign
      </Button>
    </div>
  );
}

function CampaignManagementGrid({
  campaigns,
  onSelect,
  onEdit,
  onSettings,
}: CampaignManagementGridProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-50 mb-4">
        Campaign Management
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            onSelect={onSelect}
            onEdit={onEdit}
            onSettings={onSettings}
          />
        ))}
      </div>
    </div>
  );
}

function CharacterManagementGrid({
  campaigns,
  onViewCampaign,
}: {
  campaigns: CampaignWithMeta[];
  onViewCampaign: (campaignId: string) => void;
}) {
  const campaignsWithCharacters = campaigns.filter(
    (campaign) => campaign.memberCount && campaign.memberCount > 0
  );

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-50 mb-4">
        Character Overview
      </h2>
      {campaignsWithCharacters.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No characters in any campaigns yet. Create some characters to get
            started!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaignsWithCharacters.map((campaign) => (
            <CharacterCard
              key={campaign.id}
              campaign={campaign}
              onViewCampaign={onViewCampaign}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MainDashboard({
  onCampaignSelect,
}: MainDashboardProps) {
  const {
    campaigns,
    loading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
  } = useCampaigns();
  const { fetchMembers, addMemberByEmail, removeMember, updateMemberRole } =
    useCampaignMembers();
  const { signOut, user, updateProfile, changePassword, deleteAccount } =
    useAuth();

  // State for campaign creation modal
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);

  // State for campaign editing
  const [showEditCampaignModal, setShowEditCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] =
    useState<CampaignWithMeta | null>(null);
  const [editCampaignName, setEditCampaignName] = useState("");
  const [editCampaignDescription, setEditCampaignDescription] = useState("");
  const [updatingCampaign, setUpdatingCampaign] = useState(false);

  // State for campaign settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsCampaign, setSettingsCampaign] =
    useState<CampaignWithMeta | null>(null);

  // State for account settings modal
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  // State for standalone character management modal
  const [showStandaloneCharacterModal, setShowStandaloneCharacterModal] =
    useState(false);

  // State for character management modal
  const [showCharacterManagementModal, setShowCharacterManagementModal] =
    useState(false);

  // Get characters hook for the selected campaign
  const handleCreateCampaign = async (request: CreateCampaignRequest) => {
    const result = await createCampaign(request);
    if (result.success) {
      setShowCreateCampaignModal(false);
    }
    return result;
  };

  const handleEditCampaign = (campaign: CampaignWithMeta) => {
    setEditingCampaign(campaign);
    setEditCampaignName(campaign.name);
    setEditCampaignDescription(campaign.description || "");
    setShowEditCampaignModal(true);
  };

  const handleUpdateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign || !editCampaignName.trim()) return;

    try {
      setUpdatingCampaign(true);
      await updateCampaign(editingCampaign.id, {
        name: editCampaignName,
        description: editCampaignDescription || undefined,
      });
      setShowEditCampaignModal(false);
      setEditingCampaign(null);
    } finally {
      setUpdatingCampaign(false);
    }
  };

  const handleCampaignSettings = (campaign: CampaignWithMeta) => {
    setSettingsCampaign(campaign);
    setShowSettingsModal(true);
  };

  // Wrapper functions for CampaignSettings component
  const handleUpdateCampaignFromSettings = async (
    campaignId: string,
    updates: { name?: string; description?: string | null }
  ) => {
    await updateCampaign(campaignId, {
      name: updates.name,
      description: updates.description || undefined,
    });
  };

  const handleDeleteCampaignFromSettings = async (campaignId: string) => {
    const result = await deleteCampaign(campaignId);
    if (result.success) {
      setShowSettingsModal(false);
      setSettingsCampaign(null);
    }
  };

  const handleGetMembers = async (campaignId: string) => {
    const result = await fetchMembers(campaignId);
    if (result.success && result.data) {
      // Transform the data to match CampaignSettingsContent new format
      return result.data.map((member) => ({
        id: member.id,
        user_id: member.userId,
        roles: member.roles, // Use the new roles structure
        user_profiles: {
          email: member.email,
          display_name: member.displayName || null,
        },
      }));
    }
    return undefined;
  };

  const handleAddMember = async (
    campaignId: string,
    email: string,
    roles: CampaignRoles
  ) => {
    const primaryRole = getPrimaryRole(roles);
    const result = await addMemberByEmail(
      campaignId,
      email,
      primaryRole as "admin" | "gm" | "player"
    );
    return result;
  };

  const handleRemoveMember = async (campaignId: string, userId: string) => {
    await removeMember(campaignId, userId);
  };

  const handleUpdateMemberRole = async (
    campaignId: string,
    userId: string,
    newRoles: CampaignRoles
  ) => {
    const result = await updateMemberRole(campaignId, userId, newRoles);
    return result;
  };

  // Transform CampaignWithMeta to Campaign type for CampaignSettings
  const transformCampaignForSettings = (campaign: CampaignWithMeta) => ({
    id: campaign.id,
    name: campaign.name,
    description: campaign.description || null,
    created_at: campaign.createdAt.toISOString(),
    created_by: campaign.createdBy,
    updated_at: campaign.updatedAt.toISOString(),
    userRoles: campaign.userRoles,
    member_count: campaign.memberCount,
  });

  if (loading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-50">
              Traveller Dashboard
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Welcome back! Manage your campaigns and characters.
            </p>
          </div>
          {user && (
            <UserProfileDropdown
              user={user}
              onSettings={() => setShowAccountSettings(true)}
              onSignOut={() => signOut()}
            />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        <div className="max-w-6xl mx-auto">
          {/* Error Display */}
          {error && (
            <div className="p-3 text-sm text-red-800 bg-red-100 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md mb-6">
              {error}
            </div>
          )}

          {/* Recent Activity Section */}
          <div className="mb-8">
            <RecentActivityCard
              campaigns={campaigns}
              onCampaignSelect={onCampaignSelect}
            />
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-50 mb-4">
              Quick Actions
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <QuickActionCard
                title="Create Campaign"
                description="Start a new Traveller campaign and invite players"
                icon={<Rocket className="w-8 h-8" />}
                onClick={() => setShowCreateCampaignModal(true)}
              />

              <QuickActionCard
                title="Your Characters"
                description="Create and manage your standalone characters"
                icon={<User className="w-8 h-8" />}
                onClick={() => setShowStandaloneCharacterModal(true)}
              />

              <QuickActionCard
                title="Manage Characters"
                description="View and manage all characters across campaigns"
                icon={<Users className="w-8 h-8" />}
                onClick={() => setShowCharacterManagementModal(true)}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              You can create standalone characters anytime, or create a campaign
              to enable campaign-specific features.
            </p>
          </div>

          {/* Campaign Management */}
          {campaigns.length > 0 && (
            <div className="mb-8">
              <CampaignManagementGrid
                campaigns={campaigns}
                onSelect={onCampaignSelect}
                onEdit={handleEditCampaign}
                onSettings={handleCampaignSettings}
              />
            </div>
          )}

          {/* Character Overview */}
          {campaigns.length > 0 && (
            <div className="mb-8">
              <CharacterManagementGrid
                campaigns={campaigns}
                onViewCampaign={onCampaignSelect}
              />
            </div>
          )}
        </div>
      </div>

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        isOpen={showCreateCampaignModal}
        onClose={() => setShowCreateCampaignModal(false)}
        onCreateCampaign={handleCreateCampaign}
      />

      {/* Edit Campaign Modal */}
      <Modal
        isOpen={showEditCampaignModal}
        onClose={() => setShowEditCampaignModal(false)}
        title="Edit Campaign"
      >
        <form onSubmit={handleUpdateCampaign} className="space-y-4">
          <FormField
            label="Campaign Name"
            value={editCampaignName}
            onChange={(e) => setEditCampaignName(e.target.value)}
            placeholder="Enter campaign name"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (optional)
            </label>
            <textarea
              value={editCampaignDescription}
              onChange={(e) => setEditCampaignDescription(e.target.value)}
              className="input w-full"
              rows={3}
              placeholder="Describe your campaign"
            />
          </div>

          <ModalFooter
            onCancel={() => setShowEditCampaignModal(false)}
            cancelText="Cancel"
            confirmText={updatingCampaign ? "Updating..." : "Update"}
            confirmDisabled={updatingCampaign || !editCampaignName.trim()}
            confirmType="submit"
            isLoading={updatingCampaign}
          />
        </form>
      </Modal>

      {/* Campaign Settings Modal */}
      {settingsCampaign && (
        <Modal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          title={`Settings - ${settingsCampaign.name}`}
          maxWidth="xl"
        >
          <CampaignSettingsContent
            campaign={
              transformCampaignForSettings(
                settingsCampaign
              ) as unknown as Database["public"]["Tables"]["campaigns"]["Row"] & {
                role?: string;
                member_count?: number;
              }
            }
            onUpdateCampaign={handleUpdateCampaignFromSettings}
            onDeleteCampaign={handleDeleteCampaignFromSettings}
            onGetMembers={handleGetMembers}
            onAddMember={handleAddMember}
            onUpdateMemberRole={handleUpdateMemberRole}
            onRemoveMember={handleRemoveMember}
            onClose={() => setShowSettingsModal(false)}
          />
        </Modal>
      )}

      {/* Character Management Modal */}
      <Modal
        isOpen={showCharacterManagementModal}
        onClose={() => setShowCharacterManagementModal(false)}
        title="Character Management"
        maxWidth="xl"
      >
        <CharacterManagementContent
          campaigns={campaigns}
          onViewCampaign={onCampaignSelect}
        />
      </Modal>

      {/* Standalone Character Management Modal */}
      <Modal
        isOpen={showStandaloneCharacterModal}
        onClose={() => setShowStandaloneCharacterModal(false)}
        title="Your Characters"
        maxWidth="xl"
      >
        <StandaloneCharacterManagement />
      </Modal>

      {/* Account Settings Modal */}
      {user && (
        <AccountSettings
          isOpen={showAccountSettings}
          onClose={() => setShowAccountSettings(false)}
          user={user}
          onUpdateProfile={async (data) => {
            const result = await updateProfile(data);
            if (!result.success && result.error) {
              throw new Error(result.error);
            }
          }}
          onChangePassword={async (data) => {
            const result = await changePassword(data);
            if (!result.success && result.error) {
              throw new Error(result.error);
            }
          }}
          onDeleteAccount={() => {
            deleteAccount().then(() => {
              setShowAccountSettings(false);
            });
          }}
        />
      )}
    </div>
  );
}
