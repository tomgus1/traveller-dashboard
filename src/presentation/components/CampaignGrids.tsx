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
    <div className="card-modern relative group hover:border-primary/50">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-grow">
          <h3 className="text-lg font-bold tracking-tight mb-1 text-text-main">
            {campaign.name}
          </h3>
          {campaign.description && (
            <p className="text-xs text-muted font-medium line-clamp-2 mb-2 italic">
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
        <span className="text-[10px] font-black uppercase text-muted tracking-widest">
          {campaign.memberCount || 0} member(s)
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(campaign)}
            className="p-2 text-muted hover:text-primary hover:bg-hud-accent rounded-xl transition-all duration-300 hover:scale-110"
            title="Edit Campaign"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSettings(campaign)}
            className="p-2 text-muted hover:text-primary hover:bg-hud-accent rounded-xl transition-all duration-300 hover:scale-110"
            title="Campaign Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSelect(campaign.id)}
            className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all duration-300 hover:scale-110"
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
    <div className="card-modern relative group hover:border-primary/50 p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-bold tracking-tight">
          {campaign.name}
        </h3>
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
          {characters.length} CHARACTER{characters.length !== 1 ? "S" : ""}
        </span>
      </div>

      {characters.length === 0 ? (
        <p className="text-muted text-sm mb-4 italic">
          No characters in this campaign yet.
        </p>
      ) : (
        <div className="mb-4">
          <div className="space-y-2">
            {characters.slice(0, 3).map((character) => (
              <div key={character.id} className="flex items-center text-sm">
                <div className="w-2 h-2 bg-primary rounded-full mr-2 shadow-[0_0_8px_var(--color-primary-glow)]"></div>
                <span className="text-text-main font-bold">
                  {character.characterName || character.displayName}
                </span>
              </div>
            ))}
            {characters.length > 3 && (
              <p className="text-xs text-muted ml-4">
                +{characters.length - 3} more characters
              </p>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => onViewCampaign(campaign.id)}
        className="w-full text-xs font-black uppercase tracking-widest text-primary hover:bg-primary/10 py-3 px-3 rounded-xl transition-all duration-300 mt-4"
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
      <h2 className="text-xl font-black tracking-tighter uppercase mb-6">
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
      <h2 className="text-xl font-black tracking-tighter uppercase mb-6">
        Character Overview
      </h2>
      {campaignsWithCharacters.length === 0 ? (
        <div className="card-modern p-8 text-center bg-hud-accent/50 border-dashed border-2">
          <p className="text-muted font-medium italic">
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
