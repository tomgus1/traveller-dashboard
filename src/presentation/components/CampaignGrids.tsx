import { Edit, ChevronRight, Settings } from "lucide-react";
import { useCampaignCharacters } from "../hooks/useCampaignCharacters";
import type { CampaignWithMeta } from "../../core/entities";
import { rolesToDisplayString } from "../../shared/utils/permissions";
import {
  getPrimaryRole,
  getRoleBadgeClass,
} from "../../shared/utils/roleHelpers";

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

interface CampaignManagementGridProps {
  campaigns: CampaignWithMeta[];
  onSelect: (campaignId: string) => void;
  onEdit: (campaign: CampaignWithMeta) => void;
  onSettings: (campaign: CampaignWithMeta) => void;
}

interface CharacterManagementGridProps {
  campaigns: CampaignWithMeta[];
  onViewCampaign: (campaignId: string) => void;
}

export function CampaignCard({
  campaign,
  onSelect,
  onEdit,
  onSettings,
}: CampaignCardProps) {
  const primaryRole = getPrimaryRole(campaign.userRoles);

  return (
    <div className="card p-6 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-gray-900/20 hover:border-blue-300 dark:hover:border-blue-600 hover:-translate-y-1 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-grow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-50 mb-1">
            {campaign.name}
          </h3>
          {campaign.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {campaign.description}
            </p>
          )}
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeClass(primaryRole)}`}
        >
          {rolesToDisplayString(campaign.userRoles)}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {campaign.memberCount || 0} member(s)
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(campaign)}
            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all duration-200 hover:scale-110"
            title="Edit Campaign"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSettings(campaign)}
            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all duration-200 hover:scale-110"
            title="Campaign Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSelect(campaign.id)}
            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all duration-200 hover:scale-110"
            title="Enter Campaign"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function CharacterCard({
  campaign,
  onViewCampaign,
}: CharacterCardProps) {
  const { characters } = useCampaignCharacters(campaign.id);

  return (
    <div className="card p-6 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-gray-900/20 hover:border-green-300 dark:hover:border-green-600 hover:-translate-y-1 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
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
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                +{characters.length - 3} more characters
              </p>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => onViewCampaign(campaign.id)}
        className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium py-2 px-3 rounded-md transition-all duration-200 hover:shadow-sm"
      >
        View Campaign →
      </button>
    </div>
  );
}

export function CampaignManagementGrid({
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

export function CharacterManagementGrid({
  campaigns,
  onViewCampaign,
}: CharacterManagementGridProps) {
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
