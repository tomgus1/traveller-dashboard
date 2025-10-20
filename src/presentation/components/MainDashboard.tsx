import { useState } from "react";
import { Rocket, User, Users } from "lucide-react";
import { useCampaigns } from "../hooks/useCampaigns";
import { useCampaignMembers } from "../hooks/useCampaignMembers";
import { useAuth } from "../hooks/useAuth";
import { LoadingScreen } from "./Loading";
import { Modal, ModalFooter } from "./Modal";
import FormField from "./FormField";
import CampaignSettingsContent from "./CampaignSettingsContent";
import CharacterManagementContent from "./CharacterManagementContent";
import StandaloneCharacterManagement from "./StandaloneCharacterManagement";
import UserProfileDropdown from "./UserProfileDropdown";
import AccountSettings from "./AccountSettings";
import CreateCampaignModal from "./CreateCampaignModal";
import { CampaignInvitations } from "./CampaignInvitations";
import { QuickActionCard, RecentActivityCard } from "./DashboardCards";
import {
  CampaignManagementGrid,
  CharacterManagementGrid,
} from "./CampaignGrids";
import type {
  CampaignWithMeta,
  CreateCampaignRequest,
  CampaignRoles,
} from "../../core/entities";
import { getPrimaryRole } from "../../shared/utils/roleHelpers";

interface MainDashboardProps {
  onCampaignSelect: (campaignId: string) => void;
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

  // Modal states
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [showEditCampaignModal, setShowEditCampaignModal] = useState(false);
  const [showCampaignSettingsModal, setShowCampaignSettingsModal] =
    useState(false);
  const [showCharacterManagementModal, setShowCharacterManagementModal] =
    useState(false);
  const [showStandaloneCharacterModal, setShowStandaloneCharacterModal] =
    useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  // Edit campaign state
  const [editingCampaign, setEditingCampaign] =
    useState<CampaignWithMeta | null>(null);
  const [editCampaignName, setEditCampaignName] = useState("");
  const [editCampaignDescription, setEditCampaignDescription] = useState("");
  const [updatingCampaign, setUpdatingCampaign] = useState(false);

  // Campaign settings state
  const [settingsCampaign, setSettingsCampaign] =
    useState<CampaignWithMeta | null>(null);

  // Event handlers
  const handleCreateCampaign = async (data: CreateCampaignRequest) => {
    const result = await createCampaign(data);
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
    if (!editingCampaign) return;

    setUpdatingCampaign(true);
    try {
      const result = await updateCampaign(editingCampaign.id, {
        name: editCampaignName.trim(),
        description: editCampaignDescription.trim() || undefined,
      });

      if (result.success) {
        setShowEditCampaignModal(false);
        setEditingCampaign(null);
      }
    } finally {
      setUpdatingCampaign(false);
    }
  };

  const handleCampaignSettings = (campaign: CampaignWithMeta) => {
    setSettingsCampaign(campaign);
    setShowCampaignSettingsModal(true);
  };

  // Member management handlers
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

  // Wrapper for fetchMembers to match expected signature
  const handleGetMembers = async (campaignId: string) => {
    const result = await fetchMembers(campaignId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.success ? (result.data as any) : undefined;
  };

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

          {/* Campaign Invitations Section */}
          <div className="mb-8">
            <CampaignInvitations
              onInvitationAccepted={() => {
                // Refresh campaigns when an invitation is accepted
                // The useCampaigns hook should automatically refetch
              }}
            />
          </div>

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

      {/* Modals */}
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
            confirmText={updatingCampaign ? "Updating..." : "Update Campaign"}
            confirmDisabled={updatingCampaign || !editCampaignName.trim()}
            confirmType="submit"
            isLoading={updatingCampaign}
          />
        </form>
      </Modal>

      {/* Campaign Settings Modal */}
      {settingsCampaign && (
        <Modal
          isOpen={showCampaignSettingsModal}
          onClose={() => setShowCampaignSettingsModal(false)}
          title="Campaign Settings"
          maxWidth="xl"
        >
          <CampaignSettingsContent
            campaign={transformCampaignForSettings(settingsCampaign)}
            onClose={() => setShowCampaignSettingsModal(false)}
            onGetMembers={handleGetMembers}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
            onUpdateMemberRole={handleUpdateMemberRole}
            onUpdateCampaign={async (campaignId, updates) => {
              await updateCampaign(campaignId, {
                name: updates.name,
                description: updates.description || undefined,
              });
            }}
            onDeleteCampaign={async (campaignId) => {
              const result = await deleteCampaign(campaignId);
              if (result.success) {
                setShowCampaignSettingsModal(false);
                setSettingsCampaign(null);
              }
            }}
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
          onViewCampaign={(campaignId) => {
            setShowCharacterManagementModal(false);
            onCampaignSelect(campaignId);
          }}
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
