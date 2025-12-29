import { Edit, ChevronRight, Settings } from "lucide-react";
import { useCampaignCharacters } from "../hooks/useCampaignCharacters";
import type { CampaignWithMeta } from "../../core/entities";
import { rolesToDisplayString } from "../../shared/utils/permissions";
import {
  getPrimaryRole,
  getRoleBadgeClass,
} from "../../shared/utils/roleHelpers";
import { MgTCard } from "./MgTCard";
import { MgTHeader } from "./MgTHeader";

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
    <MgTCard className="group hover:border-primary transition-all duration-300">
      <div className="flex items-start justify-between mb-4 pt-4">
        <div className="flex-grow min-w-0">
          <h3 className="text-sm font-black uppercase tracking-widest text-text-main truncate">
            {campaign.name}
          </h3>
          {campaign.description && (
            <p className="text-[10px] text-muted font-bold uppercase tracking-widest line-clamp-2 mt-1 opacity-60">
              {campaign.description}
            </p>
          )}
        </div>
        <span
          className={`px-2 py-0.5 text-[8px] font-black uppercase border border-current shrink-0 ml-2 ${getRoleBadgeClass(primaryRole)}`}
        >
          {rolesToDisplayString(campaign.userRoles)}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
        <span className="text-[8px] font-black uppercase text-muted tracking-widest">
          MEMBERS: {campaign.memberCount || 0}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(campaign)}
            className="p-1.5 text-muted hover:text-primary transition-all"
            title="Edit Campaign"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSettings(campaign)}
            className="p-1.5 text-muted hover:text-primary transition-all"
            title="Campaign Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSelect(campaign.id)}
            className="p-1.5 text-white bg-primary hover:scale-110 transition-transform ml-1"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </MgTCard>
  );
}

export function CharacterCard({
  campaign,
  onViewCampaign,
}: CharacterCardProps) {
  const { characters } = useCampaignCharacters(campaign.id);

  return (
    <MgTCard className="group hover:border-primary transition-all duration-300">
      <MgTHeader
        title={campaign.name}
        subtitle="MANIFEST"
      />

      <div className="flex items-center justify-between mb-4">
        <span className="text-[8px] font-black uppercase text-muted tracking-widest">Crew Manifest Status</span>
        <span className="px-2 py-0.5 text-[8px] font-black uppercase border border-primary text-primary">
          {characters.length} ACTIVE
        </span>
      </div>

      {characters.length === 0 ? (
        <div className="py-6 px-4 border border-dashed border-border bg-surface-low mb-4">
          <p className="text-muted text-[8px] font-black uppercase tracking-widest text-center">
            No active personnel records
          </p>
        </div>
      ) : (
        <div className="mb-4 bg-surface-low p-3 border border-border">
          <div className="space-y-2">
            {characters.slice(0, 3).map((character) => (
              <div key={character.id} className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter">
                <span className="text-text-main">
                  - {character.characterName || character.displayName}
                </span>
                <div className="w-1.5 h-1.5 bg-primary animate-pulse shadow-[0_0_5px_var(--color-primary)]"></div>
              </div>
            ))}
            {characters.length > 3 && (
              <p className="text-[8px] text-muted uppercase font-bold tracking-[0.2em] pt-1">
                + {characters.length - 3} additional files
              </p>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => onViewCampaign(campaign.id)}
        className="w-full text-[10px] font-black uppercase tracking-[0.3em] bg-side text-white hover:bg-primary py-3 transition-all"
        style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)' }}
      >
        ACCESS LOGS
      </button>
    </MgTCard>
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
      <div className="mgt-header-bar mb-6">
        <h2 className="text-xs font-black tracking-[0.3em]">Fleet Management</h2>
        <span className="text-[8px] opacity-50 px-2 py-0.5 border border-white/20">SYS // ADM-02</span>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
      <div className="mgt-header-bar mb-6">
        <h2 className="text-xs font-black tracking-[0.3em]">Personnel Database</h2>
        <span className="text-[8px] opacity-50 px-2 py-0.5 border border-white/20">SYS // PERS-01</span>
      </div>
      {campaignsWithCharacters.length === 0 ? (
        <div className="card-mgt hud-frame p-12 text-center bg-card/50">
          <p className="text-muted text-[10px] font-black uppercase tracking-[0.3em]">
            No personnel data available currently
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
