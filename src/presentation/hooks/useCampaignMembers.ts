import { useCallback, useMemo } from "react";
import { getCampaignService } from "../../core/container";
import type {
  MemberInfo,
  CampaignRole,
  CampaignRoles,
} from "../../core/entities";
import { useAsyncList } from "./useAsyncOperation";

export const useCampaignMembers = () => {
  const {
    items: members,
    loading,
    error,
    execute,
  } = useAsyncList<MemberInfo, [string]>();

  const campaignService = useMemo(() => getCampaignService(), []);

  const fetchMembers = useCallback(
    async (campaignId: string) => {
      const fetchOperation = async (cId: string) => {
        const result = await campaignService.getCampaignMembers(cId);

        if (result.success && result.data) {
          return { success: true, data: result.data };
        }

        return {
          success: false,
          error: result.error || "Failed to fetch members",
        };
      };

      return await execute(fetchOperation, campaignId);
    },
    [campaignService, execute]
  );

  const addMemberByEmail = useCallback(
    async (campaignId: string, email: string, role: CampaignRole) => {
      try {
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

        return {
          success: false,
          error: result.error || "Failed to add member",
        };
      } catch {
        return { success: false, error: "An unexpected error occurred" };
      }
    },
    [campaignService, fetchMembers]
  );

  const updateMemberRole = useCallback(
    async (campaignId: string, userId: string, roles: CampaignRoles) => {
      try {
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

        return {
          success: false,
          error: result.error || "Failed to update member role",
        };
      } catch {
        return { success: false, error: "An unexpected error occurred" };
      }
    },
    [campaignService, fetchMembers]
  );

  const removeMember = useCallback(
    async (campaignId: string, userId: string) => {
      try {
        const result = await campaignService.removeMember(campaignId, userId);

        if (result.success) {
          // Refresh the members list
          await fetchMembers(campaignId);
          return { success: true };
        }

        return {
          success: false,
          error: result.error || "Failed to remove member",
        };
      } catch {
        return { success: false, error: "An unexpected error occurred" };
      }
    },
    [campaignService, fetchMembers]
  );

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
