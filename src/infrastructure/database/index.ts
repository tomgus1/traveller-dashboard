// Supabase implementation of repository contracts
import { supabase } from "./supabase";
import type {
  User,
  Campaign,
  CampaignWithMeta,
  CampaignRole,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  MemberInfo,
  OperationResult,
} from "../../core/entities";
import type {
  AuthRepository,
  CampaignRepository,
} from "../../core/repositories";

export class SupabaseAuthRepository implements AuthRepository {
  async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email || "",
        displayName: user.user_metadata?.display_name,
        createdAt: new Date(user.created_at),
      };
    } catch {
      return null;
    }
  }

  async signIn(
    email: string,
    password: string
  ): Promise<OperationResult<User>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email || "",
        displayName: data.user.user_metadata?.display_name,
        createdAt: new Date(data.user.created_at),
      };

      return { success: true, data: user };
    } catch {
      return {
        success: false,
        error: "An unexpected error occurred during sign in",
      };
    }
  }

  async signUp(
    email: string,
    password: string
  ): Promise<OperationResult<User>> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: "Failed to create user account" };
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email || "",
        displayName: data.user.user_metadata?.display_name,
        createdAt: new Date(data.user.created_at),
      };

      return { success: true, data: user };
    } catch {
      return {
        success: false,
        error: "An unexpected error occurred during sign up",
      };
    }
  }

  async signOut(): Promise<OperationResult> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch {
      return {
        success: false,
        error: "An unexpected error occurred during sign out",
      };
    }
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        const user: User = {
          id: session.user.id,
          email: session.user.email || "",
          displayName: session.user.user_metadata?.display_name,
          createdAt: new Date(session.user.created_at),
        };
        callback(user);
      } else {
        callback(null);
      }
    });

    return () => subscription.unsubscribe();
  }
}

export class SupabaseCampaignRepository implements CampaignRepository {
  async getCampaigns(
    userId: string
  ): Promise<OperationResult<CampaignWithMeta[]>> {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          `
          *,
          campaign_members!inner(
            role,
            user_id
          ),
          member_count:campaign_members(count)
        `
        )
        .eq("campaign_members.user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        return { success: false, error: "Failed to fetch campaigns" };
      }

      const campaigns: CampaignWithMeta[] = data.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        description: campaign.description || undefined,
        createdBy: campaign.created_by,
        createdAt: new Date(campaign.created_at),
        updatedAt: new Date(campaign.updated_at),
        userRole: campaign.campaign_members[0]?.role as CampaignRole,
        memberCount: campaign.member_count?.[0]?.count || 0,
        isOwner: campaign.created_by === userId,
      }));

      return { success: true, data: campaigns };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async getCampaign(campaignId: string): Promise<OperationResult<Campaign>> {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (error) {
        return { success: false, error: "Campaign not found" };
      }

      const campaign: Campaign = {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      return { success: true, data: campaign };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async createCampaign(
    userId: string,
    request: CreateCampaignRequest
  ): Promise<OperationResult<Campaign>> {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          name: request.name,
          description: request.description,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: "Failed to create campaign" };
      }

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from("campaign_members")
        .insert({
          campaign_id: data.id,
          user_id: userId,
          role: "admin",
        });

      if (memberError) {
        // Try to clean up the campaign
        await supabase.from("campaigns").delete().eq("id", data.id);
        return {
          success: false,
          error: "Failed to set up campaign membership",
        };
      }

      const campaign: Campaign = {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      return { success: true, data: campaign };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async updateCampaign(
    campaignId: string,
    request: UpdateCampaignRequest
  ): Promise<OperationResult> {
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({
          name: request.name,
          description: request.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      if (error) {
        return { success: false, error: "Failed to update campaign" };
      }

      return { success: true };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async deleteCampaign(campaignId: string): Promise<OperationResult> {
    try {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId);

      if (error) {
        return { success: false, error: "Failed to delete campaign" };
      }

      return { success: true };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async getCampaignMembers(
    campaignId: string
  ): Promise<OperationResult<MemberInfo[]>> {
    try {
      // Get member data first
      const { data: memberData, error: memberError } = await supabase
        .from("campaign_members")
        .select("id, user_id, role, created_at")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true });

      if (memberError) {
        return { success: false, error: "Failed to fetch campaign members" };
      }

      // For now, we'll create members with placeholder email (since we can't access auth.users)
      // In a real application, you'd need to maintain email in user_profiles or use RLS policies
      const members: MemberInfo[] = memberData.map((member) => ({
        id: member.id,
        userId: member.user_id,
        email: `user_${member.user_id.slice(0, 8)}@example.com`, // Placeholder
        displayName: undefined, // Could use user_profiles.full_name if available
        role: member.role as CampaignRole,
        joinedAt: new Date(member.created_at),
      }));

      return { success: true, data: members };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async addMemberByEmail(
    campaignId: string,
    email: string,
    role: CampaignRole
  ): Promise<OperationResult> {
    try {
      // First, find the user by email
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("email", email)
        .single();

      if (profileError || !profile) {
        return {
          success: false,
          error: "User not found with that email address",
        };
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from("campaign_members")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("user_id", profile.id)
        .single();

      if (existingMember) {
        return {
          success: false,
          error: "User is already a member of this campaign",
        };
      }

      // Add the member
      const { error } = await supabase.from("campaign_members").insert({
        campaign_id: campaignId,
        user_id: profile.id,
        role,
      });

      if (error) {
        return { success: false, error: "Failed to add member to campaign" };
      }

      return { success: true };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async updateMemberRole(
    campaignId: string,
    userId: string,
    role: CampaignRole
  ): Promise<OperationResult> {
    try {
      const { error } = await supabase
        .from("campaign_members")
        .update({ role })
        .eq("campaign_id", campaignId)
        .eq("user_id", userId);

      if (error) {
        return { success: false, error: "Failed to update member role" };
      }

      return { success: true };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async removeMember(
    campaignId: string,
    userId: string
  ): Promise<OperationResult> {
    try {
      const { error } = await supabase
        .from("campaign_members")
        .delete()
        .eq("campaign_id", campaignId)
        .eq("user_id", userId);

      if (error) {
        return { success: false, error: "Failed to remove member" };
      }

      return { success: true };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async getUserRole(
    campaignId: string,
    userId: string
  ): Promise<OperationResult<CampaignRole>> {
    try {
      const { data, error } = await supabase
        .from("campaign_members")
        .select("role")
        .eq("campaign_id", campaignId)
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        return {
          success: false,
          error: "User is not a member of this campaign",
        };
      }

      return { success: true, data: data.role as CampaignRole };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async canUserAccessCampaign(
    campaignId: string,
    userId: string
  ): Promise<OperationResult<boolean>> {
    try {
      const { data, error } = await supabase
        .from("campaign_members")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("user_id", userId)
        .single();

      if (error) {
        return { success: true, data: false };
      }

      return { success: true, data: !!data };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }
}
