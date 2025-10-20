import { useState } from "react";
import { getCampaignService } from "../../core/container";
import type {
  MemberInfo,
  CampaignRole,
  CampaignRoles,
} from "../../core/entities";

export const useCampaignMembers = () => {
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const campaignService = getCampaignService();

  const fetchMembers = async (campaignId: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await campaignService.getCampaignMembers(campaignId);

      if (result.success && result.data) {
        setMembers(result.data);
        return { success: true, data: result.data };
      }

      const errorMsg = result.error || "Failed to fetch members";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } catch {
      const errorMsg = "An unexpected error occurred";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const addMemberByEmail = async (
    campaignId: string,
    email: string,
    role: CampaignRole
  ) => {
    try {
      setError(null);

      const result = await campaignService.addMemberByEmail(
        campaignId,
        email,
        role
      );

      if (result.success) {
        // Refresh the members list
        await fetchMembers(campaignId);
        return { success: true };
      }

      const errorMsg = result.error || "Failed to add member";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } catch {
      const errorMsg = "An unexpected error occurred";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const updateMemberRole = async (
    campaignId: string,
    userId: string,
    roles: CampaignRoles
  ) => {
    try {
      setError(null);

      const result = await campaignService.updateMemberRole(
        campaignId,
        userId,
        roles
      );

      if (result.success) {
        // Refresh the members list
        await fetchMembers(campaignId);
        return { success: true };
      }

      const errorMsg = result.error || "Failed to update member role";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } catch {
      const errorMsg = "An unexpected error occurred";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const removeMember = async (campaignId: string, userId: string) => {
    try {
      setError(null);

      const result = await campaignService.removeMember(campaignId, userId);

      if (result.success) {
        // Refresh the members list
        await fetchMembers(campaignId);
        return { success: true };
      }

      const errorMsg = result.error || "Failed to remove member";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } catch {
      const errorMsg = "An unexpected error occurred";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  return {
    members,
    loading,
    error,
    fetchMembers,
    addMemberByEmail,
    updateMemberRole,
    removeMember,
  };
};
