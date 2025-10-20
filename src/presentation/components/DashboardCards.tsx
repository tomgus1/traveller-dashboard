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
      className="card p-6 text-left hover:shadow-lg hover:shadow-blue-100 dark:hover:shadow-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
    >
      <div className="flex items-center space-x-4">
        <div className="text-blue-600 dark:text-blue-400 transition-transform duration-200 hover:scale-110">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-zinc-50 transition-colors duration-200">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200">
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
              className="group flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:shadow-sm cursor-pointer transition-all duration-200"
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
              <ChevronRight className="w-4 h-4 text-gray-400 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
