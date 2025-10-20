import { useEffect, useCallback, useMemo } from "react";
import { useAuth } from "./useAuth";
import { getCampaignRepository } from "../../core/container";
import type { CampaignInvitation } from "../../core/entities";
import { useAsyncList } from "./useAsyncOperation";

export const useCampaignInvitations = () => {
  const { user } = useAuth();
  const {
    items: invitations,
    loading,
    error,
    execute,
    setItems: setInvitations,
  } = useAsyncList<CampaignInvitation, []>();

  const campaignRepository = useMemo(() => getCampaignRepository(), []);

  const loadInvitations = useCallback(async () => {
    if (!user?.email) {
      return;
    }

    const loadOperation = async () => {
      // Use repository method with proper error handling for missing RPC functions
      const result = await campaignRepository.getUserInvitations(user.email);

      if (result.success) {
        return { success: true, data: result.data || [] };
      }

      // If the RPC function doesn't exist yet, show empty state without error
      if (
        result.error?.includes("function") &&
        result.error?.includes("does not exist")
      ) {
        return { success: true, data: [] };
      }

      return {
        success: false,
        error: result.error || "Failed to load invitations",
      };
    };

    await execute(loadOperation);
  }, [user?.email, campaignRepository, execute]);

  const acceptInvitation = useCallback(
    async (invitationId: string) => {
      if (!user) return { success: false, error: "User not found" };

      try {
        const result = await campaignRepository.acceptCampaignInvitation(
          invitationId,
          user.id
        );

        if (result.success) {
          // Remove the accepted invitation from the list
          setInvitations((prev) =>
            prev.filter((inv) => inv.id !== invitationId)
          );
        }

        return result;
      } catch {
        return { success: false, error: "Failed to accept invitation" };
      }
    },
    [user, campaignRepository, setInvitations]
  );

  const declineInvitation = useCallback(
    async (invitationId: string) => {
      try {
        const result =
          await campaignRepository.declineCampaignInvitation(invitationId);

        if (result.success) {
          // Remove the declined invitation from the list
          setInvitations((prev) =>
            prev.filter((inv) => inv.id !== invitationId)
          );
        }

        return result;
      } catch {
        return { success: false, error: "Failed to decline invitation" };
      }
    },
    [campaignRepository, setInvitations]
  );

  const assignCharacterAndAccept = useCallback(
    async (invitationId: string, characterId: string) => {
      if (!user) return { success: false, error: "User not found" };

      try {
        // Accept the invitation first
        const acceptResult = await acceptInvitation(invitationId);
        if (!acceptResult.success) {
          return acceptResult;
        }

        // Find the invitation to get campaign ID
        const invitation = invitations.find((inv) => inv.id === invitationId);
        if (!invitation) {
          return { success: false, error: "Invitation not found" };
        }

        // Assign character to the campaign (using direct Supabase call for now)
        const { supabase } = await import(
          "../../infrastructure/database/supabase"
        );
        const { error: assignError } = await supabase
          .from("characters")
          .update({ campaign_id: invitation.campaignId })
          .eq("id", characterId)
          .eq("owner_id", user.id);

        if (assignError) {
          return {
            success: false,
            error: "Failed to assign character to campaign",
          };
        }

        return { success: true };
      } catch {
        return {
          success: false,
          error: "Failed to accept invitation and assign character",
        };
      }
    },
    [user, invitations, acceptInvitation]
  );

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  return {
    invitations,
    loading,
    error,
    acceptInvitation,
    declineInvitation,
    assignCharacterAndAccept,
    refreshInvitations: loadInvitations,
  };
};
