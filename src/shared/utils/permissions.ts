/**
 * Permission utilities following DRY principle
 * Centralizes role-based access control logic with support for multiple roles
 */

import type { CampaignRole, CampaignRoles } from "../../core/entities";

/**
 * Utility functions for validating role combinations
 */
export function isValidRoleCombination(roles: CampaignRoles): boolean {
  const { isAdmin, isGm, isPlayer } = roles;

  // Must have at least one role
  if (!isAdmin && !isGm && !isPlayer) {
    return false;
  }

  // Cannot be both GM and Player without being Admin (conflict of interest)
  if (isGm && isPlayer && !isAdmin) {
    return false;
  }

  return true;
}

/**
 * Checks if user roles can manage campaign members (add/remove/update roles)
 * @param userRoles User's roles in the campaign or single role (backward compatibility)
 * @returns True if user can manage members
 */
export function canManageMembers(
  userRoles: CampaignRoles | CampaignRole
): boolean {
  if (typeof userRoles === "string") {
    // Backward compatibility with single role
    return ["admin", "gm"].includes(userRoles);
  }
  return userRoles.isAdmin || userRoles.isGm;
}

/**
 * Checks if user roles can update campaign settings
 * @param userRoles User's roles in the campaign or single role (backward compatibility)
 * @returns True if user can update campaign
 */
export function canUpdateCampaign(
  userRoles: CampaignRoles | CampaignRole
): boolean {
  if (typeof userRoles === "string") {
    return userRoles === "admin";
  }
  return userRoles.isAdmin;
}

/**
 * Checks if user roles can delete a campaign
 * @param userRoles User's roles in the campaign or single role (backward compatibility)
 * @returns True if user can delete campaign
 */
export function canDeleteCampaign(
  userRoles: CampaignRoles | CampaignRole
): boolean {
  if (typeof userRoles === "string") {
    return userRoles === "admin";
  }
  return userRoles.isAdmin;
}

/**
 * Checks if user roles can access campaign data (read-only)
 * @param userRoles User's roles in the campaign or single role (backward compatibility)
 * @returns True if user can access campaign
 */
export function canAccessCampaign(
  userRoles: CampaignRoles | CampaignRole
): boolean {
  if (typeof userRoles === "string") {
    return ["admin", "gm", "player"].includes(userRoles);
  }
  return userRoles.isAdmin || userRoles.isGm || userRoles.isPlayer;
}

/**
 * Backward compatibility: Convert single role to CampaignRoles
 * @param role Single role (for existing code)
 * @returns CampaignRoles object
 */
export function roleToRoles(role: CampaignRole): CampaignRoles {
  return {
    isAdmin: role === "admin",
    isGm: role === "gm",
    isPlayer: role === "player",
  };
}

/**
 * Convert CampaignRoles to display string
 * @param roles User's roles
 * @returns Human-readable role string
 */
export function rolesToDisplayString(roles: CampaignRoles): string {
  const roleNames: string[] = [];
  if (roles.isAdmin) roleNames.push("Admin");
  if (roles.isGm) roleNames.push("GM");
  if (roles.isPlayer) roleNames.push("Player");

  if (roleNames.length === 0) return "No roles";
  if (roleNames.length === 1) return roleNames[0];
  if (roleNames.length === 2) return roleNames.join(" + ");
  return `${roleNames.slice(0, -1).join(", ")} + ${roleNames[roleNames.length - 1]}`;
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
