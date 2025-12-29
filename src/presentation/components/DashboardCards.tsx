import { MgTCard } from "./MgTCard";
import { MgTHeader } from "./MgTHeader";
import type { CampaignWithMeta } from "../../core/entities";
import { rolesToDisplayString } from "../../shared/utils/permissions";
import {
  getPrimaryRole,
  getRoleBadgeClass,
} from "../../shared/utils/roleHelpers";
import { ChevronRight } from "lucide-react";

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
    <MgTCard
      onClick={!disabled ? onClick : undefined}
      className={`h-full group transition-all duration-300 block text-left w-full ${disabled
        ? "opacity-50 cursor-not-allowed border-dashed border-muted"
        : "hover:border-primary cursor-pointer"
        }`}
    >
      <div className="flex flex-col h-full bg-surface-low/50">
        <div className="flex items-center gap-3 mb-2">
          <div className={`transition-transform ${disabled ? "" : "text-primary group-hover:scale-110"}`}>
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
      </div>
    </MgTCard>
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
    <MgTCard className="h-full">
      <MgTHeader
        title="Recent Activity"
        rightContent={<div className="w-2 h-2 bg-primary animate-pulse" />}
      />

      <div className="space-y-3">
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
    </MgTCard>
  );
}
