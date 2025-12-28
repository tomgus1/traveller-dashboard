import React from "react";
import { ChevronRight } from "lucide-react";
import type { CampaignWithMeta } from "../../core/entities";
import { rolesToDisplayString } from "../../shared/utils/permissions";
import {
  getPrimaryRole,
  getRoleBadgeClass,
} from "../../shared/utils/roleHelpers";

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

interface RecentActivityCardProps {
  campaigns: CampaignWithMeta[];
  onCampaignSelect: (campaignId: string) => void;
}

export function QuickActionCard({
  title,
  description,
  icon,
  onClick,
  disabled = false,
}: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="card-modern p-6 text-left hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-300"
    >
      <div className="flex items-center space-x-4">
        <div className="text-primary transition-transform duration-300 hover:scale-110">
          {icon}
        </div>
        <div className="flex-grow">
          <h3 className="text-lg font-bold tracking-tight mb-1 text-text-main">
            {title}
          </h3>
          <p className="text-sm text-muted">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

export function RecentActivityCard({
  campaigns,
  onCampaignSelect,
}: RecentActivityCardProps) {
  const recentCampaigns = campaigns
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 3);

  return (
    <div className="card-modern p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black tracking-tighter uppercase">
          Recent Campaigns
        </h3>
        {campaigns.length > 3 && (
          <span className="text-xs font-bold text-muted uppercase tracking-widest">
            {campaigns.length} total
          </span>
        )}
      </div>

      {recentCampaigns.length === 0 ? (
        <p className="text-muted text-sm italic">
          No campaigns yet. Create your first campaign to get started!
        </p>
      ) : (
        <div className="space-y-3">
          {recentCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="group flex items-center justify-between p-4 rounded-2xl border border-border bg-hud-accent hover:bg-surface-mid hover:border-primary/30 cursor-pointer transition-all duration-300"
              onClick={() => onCampaignSelect(campaign.id)}
            >
              <div className="flex-grow">
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-text-main">
                    {campaign.name}
                  </h4>
                  {campaign.userRoles && (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full ${getRoleBadgeClass(getPrimaryRole(campaign.userRoles))}`}
                    >
                      {rolesToDisplayString(campaign.userRoles)}
                    </span>
                  )}
                </div>
                <p className="text-[10px] uppercase font-bold text-muted tracking-widest mt-1">
                  {campaign.memberCount || 0} member(s) • Updated{" "}
                  {campaign.updatedAt.toLocaleDateString()}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
