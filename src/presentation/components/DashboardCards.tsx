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
      className="card-mgt hud-frame p-6 text-left hover:border-primary transition-all duration-300 group"
    >
      <div className="flex items-center space-x-4">
        <div className="text-primary group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="flex-grow">
          <h3 className="text-xs font-black uppercase tracking-widest text-text-main mb-1">
            {title}
          </h3>
          <p className="text-[10px] text-muted font-bold uppercase tracking-tighter">
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
    <div className="card-mgt">
      <div className="mgt-header-bar -mx-6 -mt-6 mb-6">
        <span className="text-xs">Sector Activity Log</span>
        <span className="text-[8px] font-bold opacity-50 px-2 py-0.5 border border-white/20">LOG // RC-01</span>
      </div>

      {recentCampaigns.length === 0 ? (
        <p className="text-muted text-[10px] font-black uppercase tracking-widest italic py-8 text-center border-2 border-dashed border-border">
          No active sectors recorded
        </p>
      ) : (
        <div className="space-y-4">
          {recentCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="group flex items-center justify-between p-4 border border-border bg-surface-low hover:bg-white hover:border-primary cursor-pointer transition-all duration-300"
              style={{ clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)' }}
              onClick={() => onCampaignSelect(campaign.id)}
            >
              <div className="flex-grow">
                <div className="flex items-center space-x-3">
                  <h4 className="font-black text-xs uppercase tracking-widest text-text-main">
                    {campaign.name}
                  </h4>
                  {campaign.userRoles && (
                    <span
                      className={`px-2 py-0.5 text-[8px] font-black uppercase border border-current ${getRoleBadgeClass(getPrimaryRole(campaign.userRoles))}`}
                    >
                      {rolesToDisplayString(campaign.userRoles)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 opacity-60">
                  <span className="text-[8px] font-black uppercase tracking-widest">
                    MEMBERS: {campaign.memberCount || 0}
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest">
                    SYNC: {campaign.updatedAt.toLocaleDateString()}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted group-hover:text-primary transition-transform group-hover:translate-x-1" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
