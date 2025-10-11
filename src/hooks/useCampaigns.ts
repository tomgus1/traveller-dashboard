import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Database } from "../types/supabase";

type Campaign = Database["public"]["Tables"]["campaigns"]["Row"] & {
  role?: string;
  member_count?: number;
};

export const useCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // First, get all campaigns where user is a member or creator
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*");

      if (campaignError) throw campaignError;

      // For each campaign, get the user's role and member count
      const campaignsWithRole: Campaign[] = [];
      
      for (const campaign of campaignData || []) {
        // Check if user is creator (automatic admin)
        const isCreator = campaign.created_by === user.id;
        
        // Get user's role from campaign_members
        const { data: memberData } = await supabase
          .from("campaign_members")
          .select("role")
          .eq("campaign_id", campaign.id)
          .eq("user_id", user.id)
          .single();

        // Get member count
        const { count } = await supabase
          .from("campaign_members")
          .select("*", { count: "exact", head: true })
          .eq("campaign_id", campaign.id);

        // Include campaign if user is creator or member
        if (isCreator || memberData) {
          campaignsWithRole.push({
            ...campaign,
            role: isCreator ? "admin" : memberData?.role || "player",
            member_count: count || 0,
          });
        }
      }

      setCampaigns(campaignsWithRole);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch campaigns"
      );
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async (name: string, description?: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          name,
          description,
          created_by: user.id,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Add creator as admin
      const { error: memberError } = await supabase
        .from("campaign_members")
        .insert({
          campaign_id: campaign.id,
          user_id: user.id,
          role: "admin",
        });

      if (memberError) throw memberError;

      await fetchCampaigns();
      return campaign;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create campaign"
      );
      throw err;
    }
  };

  const addMember = async (
    campaignId: string,
    userEmail: string,
    role: "admin" | "gm" | "player"
  ) => {
    try {
      // This would need a server function to look up user by email
      // For now, we'll assume you have the user ID
      const { error } = await supabase.from("campaign_members").insert({
        campaign_id: campaignId,
        user_id: userEmail, // This should be user ID, not email
        role,
      });

      if (error) throw error;
      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
      throw err;
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  return {
    campaigns,
    loading,
    error,
    refetch: fetchCampaigns,
    createCampaign,
    addMember,
  };
};
