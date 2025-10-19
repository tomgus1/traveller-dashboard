/**
 * Permission utilities following DRY principle
 * Centralizes role-based access control logic
 */

import type { CampaignRole } from "../../core/entities";

/**
 * Checks if a user role can manage campaign members (add/remove/update roles)
 * @param userRole Current user's role in the campaign
 * @returns True if user can manage members
 */
export function canManageMembers(userRole: CampaignRole): boolean {
  return ["admin", "gm"].includes(userRole);
}

/**
 * Checks if a user role can update campaign settings
 * @param userRole Current user's role in the campaign
 * @returns True if user can update campaign
 */
export function canUpdateCampaign(userRole: CampaignRole): boolean {
  return userRole === "admin";
}

/**
 * Checks if a user role can delete a campaign
 * @param userRole Current user's role in the campaign
 * @returns True if user can delete campaign
 */
export function canDeleteCampaign(userRole: CampaignRole): boolean {
  return userRole === "admin";
}

/**
 * Checks if a user role can access campaign data (read-only)
 * @param userRole Current user's role in the campaign
 * @returns True if user can access campaign
 */
export function canAccessCampaign(userRole: CampaignRole): boolean {
  return ["admin", "gm", "player"].includes(userRole);
}

/**
 * Gets error message for insufficient permissions
 * @param action The action being attempted
 * @param requiredRoles The roles that can perform this action
 * @returns Formatted error message
 */
export function getPermissionError(
  action: string,
  requiredRoles: CampaignRole[]
): string {
  const roleText =
    requiredRoles.length === 1
      ? `${requiredRoles[0]}s`
      : `${requiredRoles.slice(0, -1).join(", ")} and ${requiredRoles[requiredRoles.length - 1]}s`;

  return `Only ${roleText} can ${action}`;
}
