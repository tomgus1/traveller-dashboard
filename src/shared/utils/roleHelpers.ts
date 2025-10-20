import type { CampaignRoles } from "../../core/entities";

/**
 * Utility functions for campaign role management
 * Extracted from MainDashboard to improve reusability and testability
 */

// Helper function to get primary role for styling (simple backward compatibility)
export const getPrimaryRole = (roles: CampaignRoles): string => {
  if (roles.isAdmin) return "admin";
  if (roles.isGm) return "gm";
  return "player";
};

export function getRoleBadgeClass(primaryRole: string): string {
  if (primaryRole === "admin") {
    return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400";
  }
  if (primaryRole === "gm") {
    return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400";
  }
  return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400";
}
