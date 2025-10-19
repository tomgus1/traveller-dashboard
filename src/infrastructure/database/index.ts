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
  // Private helper method to create User object from auth user (DRY principle)
  private createUserFromProfileData(
    authUser: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
      created_at: string;
    },
    profileData?: {
      display_name?: string;
      username?: string;
      profile_completed?: boolean;
    }
  ): User {
    return {
      id: authUser.id,
      email: authUser.email || "",
      displayName:
        profileData?.display_name ||
        (authUser.user_metadata?.display_name as string) ||
        authUser.email?.split("@")[0],
      username:
        profileData?.username ||
        (authUser.user_metadata?.username as string) ||
        authUser.email?.split("@")[0],
      profileCompleted:
        profileData?.profile_completed ||
        Boolean(authUser.user_metadata?.profile_completed),
      createdAt: new Date(authUser.created_at),
    };
  }

  private async mapAuthUserToUser(authUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    created_at: string;
  }): Promise<User> {
    // Try to fetch profile data from database (gracefully handle missing columns)
    try {
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("display_name, username, profile_completed")
        .eq("id", authUser.id)
        .single();

      // Ensure profileData is a valid object before using it
      if (profileData && typeof profileData === "object") {
        return this.createUserFromProfileData(authUser, profileData);
      }

      return this.createUserFromProfileData(authUser);
    } catch {
      // Fallback to auth metadata if database columns don't exist yet
      return this.createUserFromProfileData(authUser);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return null;
      }

      // Now using proper database query for accurate profile data
      return await this.mapAuthUserToUser(user);
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
      // Get the current origin for the redirect URL (works for both localhost and production)
      const redirectTo = `${window.location.origin}`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: "Failed to create user account" };
      }

      // Note: User profile creation is now handled automatically by database trigger
      // The trigger in the database will create the user_profiles entry

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
    } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user) {
        // Use the same mapping logic as getCurrentUser (DRY principle)
        const user = await this.mapAuthUserToUser(session.user);
        callback(user);
      } else {
        callback(null);
      }
    });

    return () => subscription.unsubscribe();
  }

  // Profile management methods
  async completeProfile(
    userId: string,
    displayName: string,
    username: string
  ): Promise<OperationResult<User>> {
    try {
      // Update user_profiles table
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          display_name: displayName,
          username,
          profile_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profileError) {
        if (profileError.code === "23505") {
          return { success: false, error: "Username is already taken" };
        }
        return { success: false, error: profileError.message };
      }

      // Update auth user metadata
      const { data: authData, error: authError } =
        await supabase.auth.updateUser({
          data: {
            display_name: displayName,
            username,
            profile_completed: true,
          },
        });

      if (authError) {
        return { success: false, error: authError.message };
      }

      const user: User = {
        id: authData.user.id,
        email: authData.user.email || "",
        displayName,
        username,
        profileCompleted: true,
        createdAt: new Date(authData.user.created_at),
      };

      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to complete profile",
      };
    }
  }

  private buildProfileUpdates(
    displayName?: string,
    username?: string
  ): Record<string, string | boolean> {
    const updates: Record<string, string | boolean> = {
      updated_at: new Date().toISOString(),
    };

    if (displayName !== undefined) {
      updates.display_name = displayName;
    }
    if (username !== undefined) {
      updates.username = username;
    }

    return updates;
  }

  private buildAuthUpdates(
    displayName?: string,
    username?: string
  ): Record<string, string> {
    const authUpdates: Record<string, string> = {};

    if (displayName !== undefined) {
      authUpdates.display_name = displayName;
    }
    if (username !== undefined) {
      authUpdates.username = username;
    }

    return authUpdates;
  }

  async updateProfile(
    userId: string,
    displayName?: string,
    username?: string
  ): Promise<OperationResult<User>> {
    try {
      // Update user_profiles table
      const updates = this.buildProfileUpdates(displayName, username);
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("id", userId);

      if (profileError) {
        if (profileError.code === "23505") {
          return { success: false, error: "Username is already taken" };
        }
        return { success: false, error: profileError.message };
      }

      // Update auth user metadata
      const authUpdates = this.buildAuthUpdates(displayName, username);
      const { data: authData, error: authError } =
        await supabase.auth.updateUser({
          data: authUpdates,
        });

      if (authError) {
        return { success: false, error: authError.message };
      }

      // Get updated profile data
      const { data: updatedProfileData } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      type ProfileData = {
        display_name?: string;
        username?: string;
        profile_completed?: boolean;
      };

      const updatedProfile = updatedProfileData as ProfileData;

      const user: User = {
        id: authData.user.id,
        email: authData.user.email || "",
        displayName:
          updatedProfile?.display_name ||
          authData.user.user_metadata?.display_name,
        username:
          updatedProfile?.username || authData.user.user_metadata?.username,
        profileCompleted:
          updatedProfile?.profile_completed ||
          authData.user.user_metadata?.profile_completed ||
          false,
        createdAt: new Date(authData.user.created_at),
      };

      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update profile",
      };
    }
  }

  async changePassword(
    _userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<OperationResult> {
    try {
      // First verify current password by signing in
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user?.email) {
        return { success: false, error: "User not found" };
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: currentUser.user.email,
        password: currentPassword,
      });

      if (verifyError) {
        return { success: false, error: "Current password is incorrect" };
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to change password",
      };
    }
  }

  async deleteAccount(userId: string): Promise<OperationResult> {
    try {
      // Delete user profile (cascades will handle related data)
      const { error: profileError } = await supabase
        .from("user_profiles")
        .delete()
        .eq("id", userId);

      if (profileError) {
        return { success: false, error: profileError.message };
      }

      // Delete auth user (this is usually restricted in Supabase)
      // For now, we'll just mark the profile as deleted
      // In production, you might want to use Supabase's admin API or a serverless function

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete account",
      };
    }
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
        return {
          success: false,
          error: `Failed to create campaign: ${error.message}`,
        };
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
          error: `Failed to set up campaign membership: ${memberError.message}`,
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

  // Basic character management functions (not full repository yet)
  async getCharactersByCampaign(campaignId: string) {
    try {
      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async createCharacterForCampaign(
    campaignId: string,
    userId: string,
    name: string,
    playerName?: string,
    characterName?: string
  ) {
    try {
      const { data, error } = await supabase
        .from("characters")
        .insert({
          campaign_id: campaignId,
          name,
          player_name: playerName,
          character_name: characterName,
          owner_id: userId,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async deleteCharacter(characterId: string, userId: string) {
    try {
      // First check if the user owns this character or has permission to delete it
      const { data: character, error: fetchError } = await supabase
        .from("characters")
        .select("*, campaigns!inner(created_by)")
        .eq("id", characterId)
        .single();

      if (fetchError) {
        return { success: false, error: "Character not found" };
      }

      // Check if user owns the character or is the campaign owner
      if (
        character.owner_id !== userId &&
        character.campaigns.created_by !== userId
      ) {
        return {
          success: false,
          error: "You don't have permission to delete this character",
        };
      }

      const { error } = await supabase
        .from("characters")
        .delete()
        .eq("id", characterId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }
}
