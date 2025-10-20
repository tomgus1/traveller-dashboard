// Temporary workaround for missing RPC function types
// TODO: Remove this file once Supabase types are regenerated

import { supabase } from "./supabase";

// Type-safe wrappers for RPC functions until types are updated
export const invitationRPC = {
  async createCampaignInvitation(params: {
    p_campaign_id: string;
    p_invited_email: string;
    p_invited_by: string;
    p_roles_offered: string;
  }) {
    return (
      supabase as unknown as {
        rpc: (
          name: string,
          params: Record<string, unknown>
        ) => Promise<{ data: unknown; error: unknown }>;
      }
    ).rpc("create_campaign_invitation", params);
  },

  async getUserInvitations(params: { p_user_email: string }) {
    return (
      supabase as unknown as {
        rpc: (
          name: string,
          params: Record<string, unknown>
        ) => Promise<{ data: unknown; error: unknown }>;
      }
    ).rpc("get_user_invitations", params);
  },

  async acceptCampaignInvitation(params: {
    p_invitation_id: string;
    p_user_id: string;
  }) {
    return (
      supabase as unknown as {
        rpc: (
          name: string,
          params: Record<string, unknown>
        ) => Promise<{ data: unknown; error: unknown }>;
      }
    ).rpc("accept_campaign_invitation", params);
  },

  async declineCampaignInvitation(params: { p_invitation_id: string }) {
    return (
      supabase as unknown as {
        rpc: (
          name: string,
          params: Record<string, unknown>
        ) => Promise<{ data: unknown; error: unknown }>;
      }
    ).rpc("decline_campaign_invitation", params);
  },
};
