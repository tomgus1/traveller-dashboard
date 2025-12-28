import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Rocket,
  User,
} from "lucide-react";
import { useCampaigns } from "../hooks/useCampaigns";
import { useCampaignMembers } from "../hooks/useCampaignMembers";
import { LoadingScreen } from "./Loading";
import { Modal, ModalFooter } from "./Modal";
import FormField from "./FormField";
import CampaignSettingsContent from "./CampaignSettingsContent";
import StandaloneCharacterManagement from "./StandaloneCharacterManagement";
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

export default function MainDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
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

  // Modal states
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [showEditCampaignModal, setShowEditCampaignModal] = useState(false);
  const [showCampaignSettingsModal, setShowCampaignSettingsModal] =
    useState(false);
  const [showStandaloneCharacterModal, setShowStandaloneCharacterModal] =
    useState(false);

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
    <>
      {/* Page Header (Local contextual header) */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-hud">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-2">
            {location.pathname === '/' && <>Mission <span className="text-primary">Control</span></>}
            {location.pathname === '/campaigns' && <>Tactical <span className="text-primary">Campaigns</span></>}
            {location.pathname === '/characters' && <>Personnel <span className="text-primary">Roster</span></>}
          </h1>
          <p className="text-lg text-muted font-medium">
            {location.pathname === '/' && "System Online. Welcome back, Commissioner."}
            {location.pathname === '/campaigns' && "Active theater operations and deployment logs."}
            {location.pathname === '/characters' && "Active personnel and biological signatures detected."}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Error Display */}
          {error && (
            <div className="lg:col-span-12 p-3 text-sm text-red-800 bg-red-100 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md mb-6">
              {error}
            </div>
          )}

          {/* Left Column: Activity & Overview */}
          <div className="lg:col-span-8 space-y-8">
            {(location.pathname === '/' || location.pathname === '/campaigns') && (
              <>
                {/* Recent Activity Section */}
                {location.pathname === '/' && (
                  <div className="animate-hud delay-100">
                    <RecentActivityCard
                      campaigns={campaigns}
                      onCampaignSelect={(campaignId) =>
                        navigate(`/campaign/${campaignId}`)
                      }
                    />
                  </div>
                )}

                {/* Campaign Management */}
                {campaigns.length > 0 && (
                  <div className="animate-hud delay-200">
                    <CampaignManagementGrid
                      campaigns={campaigns}
                      onSelect={(campaignId) => navigate(`/campaign/${campaignId}`)}
                      onEdit={handleEditCampaign}
                      onSettings={handleCampaignSettings}
                    />
                  </div>
                )}
              </>
            )}

            {location.pathname === '/characters' && (
              <div className="animate-hud">
                <CharacterManagementGrid
                  campaigns={campaigns}
                  onViewCampaign={(campaignId) =>
                    navigate(`/campaign/${campaignId}`)
                  }
                />
              </div>
            )}
          </div>

          {/* Right Column: Actions & Invites */}
          <div className="lg:col-span-4 space-y-8">
            {/* Quick Actions */}
            <div className="animate-hud delay-100">
              <h2 className="text-lg font-black tracking-tighter uppercase mb-4 px-2">
                Quick Actions
              </h2>
              <div className="grid gap-4">
                {(location.pathname === '/' || location.pathname === '/campaigns') && (
                  <QuickActionCard
                    title="New Campaign"
                    description="Deploy a new mission"
                    icon={<Rocket className="w-6 h-6" />}
                    onClick={() => setShowCreateCampaignModal(true)}
                  />
                )}
                {(location.pathname === '/' || location.pathname === '/characters') && (
                  <QuickActionCard
                    title="Characters"
                    description="Active personnel"
                    icon={<User className="w-6 h-6" />}
                    onClick={() => setShowStandaloneCharacterModal(true)}
                  />
                )}
              </div>
            </div>

            {/* Campaign Invitations Section */}
            {location.pathname === '/' && (
              <div className="animate-hud delay-200">
                <CampaignInvitations
                  onInvitationAccepted={() => {
                    // Refresh happens via hook
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Full Width Footer Section: Character Overview (Only on home) */}
        {location.pathname === '/' && campaigns.length > 0 && (
          <div className="animate-hud delay-300">
            <CharacterManagementGrid
              campaigns={campaigns}
              onViewCampaign={(campaignId) =>
                navigate(`/campaign/${campaignId}`)
              }
            />
          </div>
        )}
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

      {/* Your Characters Modal */}
      <Modal
        isOpen={showStandaloneCharacterModal}
        onClose={() => setShowStandaloneCharacterModal(false)}
        title="Your Characters"
        maxWidth="xl"
      >
        <StandaloneCharacterManagement campaigns={campaigns} />
      </Modal>
    </>
  );
}
