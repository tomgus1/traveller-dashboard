import { useState } from "react";
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
import type { CampaignWithMeta } from "../../core/entities";

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

function getRoleBadgeClass(role: string): string {
  if (role === "admin") {
    return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400";
  }
  if (role === "gm") {
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
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
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
                  {campaign.userRole && (
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeClass(campaign.userRole)}`}
                    >
                      {campaign.userRole.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {campaign.memberCount || 0} member(s) • Updated{" "}
                  {campaign.updatedAt.toLocaleDateString()}
                </p>
              </div>
              <div className="text-gray-400 dark:text-gray-500">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
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
        {campaign.userRole && (
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeClass(campaign.userRole)}`}
          >
            {campaign.userRole.toUpperCase()}
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
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </Button>
        <Button size="sm" onClick={() => onSettings(campaign)}>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
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
  const { fetchMembers, removeMember } = useCampaignMembers();
  const { signOut, user } = useAuth();

  // State for campaign creation modal
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignDescription, setNewCampaignDescription] = useState("");
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  // State for character creation modal
  const [showCreateCharacterModal, setShowCreateCharacterModal] =
    useState(false);
  const [selectedCampaignForCharacter, setSelectedCampaignForCharacter] =
    useState<string>("");
  const [playerName, setPlayerName] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [creatingCharacter, setCreatingCharacter] = useState(false);
  const [characterError, setCharacterError] = useState<string | null>(null);

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

  // State for character management modal
  const [showCharacterManagementModal, setShowCharacterManagementModal] =
    useState(false);

  // Get characters hook for the selected campaign
  const { createCharacter } = useCampaignCharacters(
    selectedCampaignForCharacter
  );

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    try {
      setCreatingCampaign(true);
      const result = await createCampaign({
        name: newCampaignName,
        description: newCampaignDescription || undefined,
      });

      if (result.success) {
        setNewCampaignName("");
        setNewCampaignDescription("");
        setShowCreateCampaignModal(false);
      }
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !user ||
      !playerName.trim() ||
      !characterName.trim() ||
      !selectedCampaignForCharacter
    ) {
      return;
    }

    try {
      setCreatingCharacter(true);
      setCharacterError(null);
      const result = await createCharacter(
        playerName.trim(),
        characterName.trim(),
        user.id
      );

      if (result.success) {
        setPlayerName("");
        setCharacterName("");
        setSelectedCampaignForCharacter("");
        setShowCreateCharacterModal(false);
      } else {
        setCharacterError(result.error || "Failed to create character");
      }
    } finally {
      setCreatingCharacter(false);
    }
  };

  const handleCreateCharacterClick = () => {
    if (campaigns.length === 0) {
      setCharacterError(
        "You need to create a campaign first before adding characters!"
      );
      setTimeout(() => setCharacterError(null), 5000);
      return;
    }
    setShowCreateCharacterModal(true);
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
      // Transform the data to match CampaignSettings expected format
      return result.data.map((member) => ({
        id: member.id,
        user_id: member.userId,
        role: member.role,
        user_profiles: {
          email: member.email,
          display_name: member.displayName || null,
        },
      }));
    }
    return undefined;
  };

  const handleRemoveMember = async (campaignId: string, userId: string) => {
    await removeMember(campaignId, userId);
  };

  // Transform CampaignWithMeta to Campaign type for CampaignSettings
  const transformCampaignForSettings = (campaign: CampaignWithMeta) => ({
    id: campaign.id,
    name: campaign.name,
    description: campaign.description || null,
    created_at: campaign.createdAt.toISOString(),
    created_by: campaign.createdBy,
    updated_at: campaign.updatedAt.toISOString(),
    role: campaign.userRole,
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
          <Button onClick={signOut}>Sign Out</Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        <div className="max-w-6xl mx-auto">
          {/* Error Display */}
          {(error || characterError) && (
            <div className="p-3 text-sm text-red-800 bg-red-100 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md mb-6">
              {error || characterError}
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
                icon={
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                }
                onClick={() => setShowCreateCampaignModal(true)}
              />

              <QuickActionCard
                title="Create Character"
                description="Add a new character to one of your campaigns"
                icon={
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                }
                onClick={handleCreateCharacterClick}
                disabled={campaigns.length === 0}
              />

              <QuickActionCard
                title="Manage Characters"
                description="View and manage all characters across campaigns"
                icon={
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                }
                onClick={() => setShowCharacterManagementModal(true)}
                disabled={campaigns.length === 0}
              />
            </div>
            {campaigns.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Create a campaign first to enable character management features.
              </p>
            )}
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
      <Modal
        isOpen={showCreateCampaignModal}
        onClose={() => setShowCreateCampaignModal(false)}
        title="Create New Campaign"
      >
        <form onSubmit={handleCreateCampaign} className="space-y-4">
          <FormField
            label="Campaign Name"
            value={newCampaignName}
            onChange={(e) => setNewCampaignName(e.target.value)}
            placeholder="Enter campaign name"
            required
          />

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
            onCancel={() => setShowCreateCampaignModal(false)}
            cancelText="Cancel"
            confirmText={creatingCampaign ? "Creating..." : "Create"}
            confirmDisabled={creatingCampaign || !newCampaignName.trim()}
            confirmType="submit"
            isLoading={creatingCampaign}
          />
        </form>
      </Modal>

      {/* Create Character Modal */}
      <Modal
        isOpen={showCreateCharacterModal}
        onClose={() => setShowCreateCharacterModal(false)}
        title="Create New Character"
      >
        <form onSubmit={handleCreateCharacter} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Campaign
            </label>
            <select
              value={selectedCampaignForCharacter}
              onChange={(e) => setSelectedCampaignForCharacter(e.target.value)}
              className="input w-full"
              required
            >
              <option value="">Select a campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>

          <FormField
            label="Player Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g. John Smith"
            required
          />

          <FormField
            label="Character Name"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder="e.g. Lt. Sally Riddle"
            required
          />

          <ModalFooter
            onCancel={() => setShowCreateCharacterModal(false)}
            cancelText="Cancel"
            confirmText={creatingCharacter ? "Creating..." : "Create"}
            confirmDisabled={
              creatingCharacter ||
              !playerName.trim() ||
              !characterName.trim() ||
              !selectedCampaignForCharacter
            }
            confirmType="submit"
            isLoading={creatingCharacter}
          />
        </form>
      </Modal>

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
            campaign={transformCampaignForSettings(settingsCampaign)}
            onUpdateCampaign={handleUpdateCampaignFromSettings}
            onDeleteCampaign={handleDeleteCampaignFromSettings}
            onGetMembers={handleGetMembers}
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
    </div>
  );
}
