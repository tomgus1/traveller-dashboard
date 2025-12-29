// Supabase implementation of repository contracts
import { supabase } from "./supabase";
import type {
  User,
  Campaign,
  CampaignWithMeta,
  CampaignRole,
  CampaignRoles,
  CampaignInvitation,
  PendingInvitation,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  MemberInfo,
  OperationResult,
  Character,
  CreateCharacterRequest,
} from "../../core/entities";
import type {
  AuthRepository,
  CampaignRepository,
} from "../../core/repositories";

import { UserMapper } from "../mappers/UserMapper";
import { CharacterMapper } from "../mappers/CharacterMapper";

// Internal interface for Supabase pending invitation response
interface SupabasePendingInvitationResponse {
  id: string;
  email: string;
  campaign_id: string;
  invited_by: string;
  role: string;
  created_at: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  campaigns: { name: string } | null;
}

export class SupabaseAuthRepository implements AuthRepository {

  private async mapAuthUserToUser(authUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    created_at: string;
  }): Promise<User> {
    // Try to fetch profile data from database (gracefully handle missing columns)
    try {
      // Ensure we have a valid client connection
      const { isSupabaseConfigured } = await import("./supabase");
      if (isSupabaseConfigured) {
        const { data: profileData, error } = await supabase
          .from("user_profiles")
          .select("display_name, username, profile_completed")
          .eq("id", authUser.id)
          .single();

        if (!error && profileData) {
          return UserMapper.toDomain(authUser, profileData);
        }
      }
      return UserMapper.toDomain(authUser);
    } catch {
      // Fallback to auth metadata if database columns don't exist yet
      return UserMapper.toDomain(authUser);
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
      const redirectTo = `${window.location.origin}/traveller-dashboard/`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: email.split("@")[0],
          },
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
            is_admin,
            is_gm,
            is_player,
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

      const campaigns: CampaignWithMeta[] = data.map((campaign) => {
        const member = campaign.campaign_members[0] as unknown as {
          is_admin: boolean;
          is_gm: boolean;
          is_player: boolean;
          user_id: string;
        };

        return {
          id: campaign.id,
          name: campaign.name,
          description: campaign.description || undefined,
          createdBy: campaign.created_by,
          createdAt: new Date(campaign.created_at || Date.now()),
          updatedAt: new Date(campaign.updated_at || Date.now()),
          userRoles: member
            ? {
              isAdmin: member.is_admin || false,
              isGm: member.is_gm || false,
              isPlayer: member.is_player || false,
            }
            : {
              isAdmin: false,
              isGm: false,
              isPlayer: false,
            },
          memberCount: campaign.member_count?.[0]?.count || 0,
          isOwner: campaign.created_by === userId,
        };
      });

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
        createdAt: new Date(data.created_at || Date.now()),
        updatedAt: new Date(data.updated_at || Date.now()),
      };

      return { success: true, data: campaign };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async createCampaign(
    userId: string,
    request: CreateCampaignRequest,
    creatorIsAlsoGM = false
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

      // Add creator as admin (always)
      const { error: adminError } = await supabase
        .from("campaign_members")
        .insert({
          campaign_id: data.id,
          user_id: userId,
          role: "admin",
        });

      if (adminError) {
        // Try to clean up the campaign
        await supabase.from("campaigns").delete().eq("id", data.id);
        return {
          success: false,
          error: `Failed to set up campaign admin: ${adminError.message}`,
        };
      }

      // If creator also wants to be GM, add a second membership record
      if (creatorIsAlsoGM) {
        const { error: gmError } = await supabase
          .from("campaign_members")
          .insert({
            campaign_id: data.id,
            user_id: userId,
            role: "gm",
          });

        if (gmError) {
          // Note: We don't fail the campaign creation if GM role fails
          // The user will still be admin and can add GM role later
          // Silent failure for optional GM role
        }
      }

      const campaign: Campaign = {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at || Date.now()),
        updatedAt: new Date(data.updated_at || Date.now()),
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
        .select("id, user_id, is_admin, is_gm, is_player, created_at")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true });

      if (memberError) {
        return { success: false, error: "Failed to fetch campaign members" };
      }

      // Get user profile data for each member
      const members: MemberInfo[] = [];
      for (const memberRow of memberData) {
        // Type assertion for new columns until Supabase types are regenerated
        const member = memberRow as unknown as {
          id: string;
          user_id: string;
          is_admin: boolean;
          is_gm: boolean;
          is_player: boolean;
          created_at: string;
        };

        try {
          const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", member.user_id)
            .single();

          let email: string;
          let displayName: string | undefined;
          let username: string | undefined;

          if (!profileError && profile) {
            // Direct property access - profile should have all fields
            const profileData = profile as Record<string, unknown>;
            email = (profileData.email as string) || "";
            displayName = (profileData.display_name as string) || undefined;
            username = (profileData.username as string) || undefined;
          } else {
            // Profile doesn't exist - this shouldn't happen but use fallback
            email = `user_${member.user_id.slice(0, 8)}@example.com`;
            displayName = undefined;
            username = undefined;
          }

          members.push({
            id: member.id,
            userId: member.user_id,
            email,
            displayName,
            username,
            roles: {
              isAdmin: member.is_admin || false,
              isGm: member.is_gm || false,
              isPlayer: member.is_player || false,
            },
            joinedAt: new Date(member.created_at),
          });
        } catch {
          // If we can't get profile data, create member with fallback data
          members.push({
            id: member.id,
            userId: member.user_id,
            email: `user_${member.user_id.slice(0, 8)}@example.com`,
            displayName: undefined,
            username: undefined,
            roles: {
              isAdmin: member.is_admin || false,
              isGm: member.is_gm || false,
              isPlayer: member.is_player || false,
            },
            joinedAt: new Date(member.created_at),
          });
        }
      }

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
        // User not found - send invitation via Edge Function
        // The Edge Function will create the database record AND send the email
        const currentUser = await supabase.auth.getUser();
        if (!currentUser.data.user) {
          return {
            success: false,
            error: "You must be logged in to send invitations",
          };
        }

        try {
          const { data, error: emailError } = await supabase.functions.invoke(
            "invite-user",
            {
              body: {
                email,
                campaignId,
                role,
                campaignName: undefined, // Will be fetched in Edge Function
              },
            }
          );

          if (emailError) {
            return {
              success: false,
              error: `Failed to send invitation: ${emailError.message || JSON.stringify(emailError)}`,
            };
          }

          if (data?.error) {
            // Edge Function returned an error in the response
            return {
              success: false,
              error: `${data.error}${data.details ? `: ${data.details}` : ""}`,
            };
          }

          // Success - both database record and email sent by Edge Function
          return {
            success: true,
          };
        } catch (err) {
          return {
            success: false,
            error: `Failed to send invitation: ${err instanceof Error ? err.message : "Unknown error"}`,
          };
        }
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
    roles: CampaignRoles
  ): Promise<OperationResult> {
    try {
      const { error } = await supabase
        .from("campaign_members")
        .update({
          is_admin: roles.isAdmin,
          is_gm: roles.isGm,
          is_player: roles.isPlayer,
        } as Record<string, boolean>)
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

  // Pending invitation methods
  async createPendingInvitation(
    campaignId: string,
    email: string,
    role: CampaignRole,
    invitedBy: string
  ): Promise<OperationResult<PendingInvitation>> {
    try {
      // Check if there's already a pending invitation for this email and campaign
      const { data: existingInvitation } = await supabase
        .from("pending_invitations")
        .select("id")
        .eq("email", email)
        .eq("campaign_id", campaignId)
        .is("accepted_at", null)
        .gte("expires_at", new Date().toISOString())
        .single();

      if (existingInvitation) {
        return {
          success: false,
          error:
            "An invitation has already been sent to this email address for this campaign",
        };
      }

      // Get campaign name for the invitation
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("name")
        .eq("id", campaignId)
        .single();

      // Get inviter name
      const { data: inviter } = await supabase
        .from("user_profiles")
        .select("display_name, email")
        .eq("id", invitedBy)
        .single();

      // Create the pending invitation
      const { data: invitation, error } = await supabase
        .from("pending_invitations")
        .insert({
          email,
          campaign_id: campaignId,
          invited_by: invitedBy,
          role,
        })
        .select(
          `
          id,
          email,
          campaign_id,
          invited_by,
          role,
          created_at,
          expires_at,
          accepted_at
        `
        )
        .single();

      if (error) {
        return { success: false, error: "Failed to create invitation" };
      }

      // Call the email function (placeholder for now)
      await supabase.rpc("send_campaign_invitation", {
        p_email: email,
        p_campaign_id: campaignId,
        p_campaign_name: campaign?.name || "Unknown Campaign",
        p_inviter_name:
          inviter?.display_name || inviter?.email || "Unknown User",
        p_role: role,
      });

      const pendingInvitation: PendingInvitation = {
        id: invitation.id,
        email: invitation.email,
        campaignId: invitation.campaign_id,
        campaignName: campaign?.name,
        invitedBy: invitation.invited_by,
        inviterName: inviter?.display_name || inviter?.email,
        role: invitation.role as CampaignRole,
        createdAt: new Date(invitation.created_at || ""),
        expiresAt: new Date(invitation.expires_at || ""),
        acceptedAt: invitation.accepted_at
          ? new Date(invitation.accepted_at)
          : undefined,
      };

      return { success: true, data: pendingInvitation };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async getPendingInvitations(
    campaignId: string
  ): Promise<OperationResult<PendingInvitation[]>> {
    try {
      const { data: invitations, error } = await supabase
        .from("pending_invitations")
        .select(
          `
          id,
          email,
          campaign_id,
          invited_by,
          role,
          created_at,
          expires_at,
          accepted_at,
          campaigns(name)
        `
        )
        .eq("campaign_id", campaignId)
        .is("accepted_at", null)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        return { success: false, error: "Failed to fetch pending invitations" };
      }

      const pendingInvitations: PendingInvitation[] = (invitations || []).map(
        (inv: SupabasePendingInvitationResponse) => ({
          id: inv.id,
          email: inv.email,
          campaignId: inv.campaign_id,
          campaignName: inv.campaigns?.name,
          invitedBy: inv.invited_by,
          inviterName: undefined, // TODO: Fetch inviter details separately if needed
          role: inv.role as CampaignRole,
          createdAt: new Date(inv.created_at || ""),
          expiresAt: new Date(inv.expires_at || ""),
          acceptedAt: inv.accepted_at ? new Date(inv.accepted_at) : undefined,
        })
      );

      return { success: true, data: pendingInvitations };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async getUserPendingInvitations(
    email: string
  ): Promise<OperationResult<PendingInvitation[]>> {
    try {
      const { data: invitations, error } = await supabase
        .from("pending_invitations")
        .select(
          `
          id,
          email,
          campaign_id,
          invited_by,
          role,
          created_at,
          expires_at,
          accepted_at,
          campaigns(name)
        `
        )
        .eq("email", email)
        .is("accepted_at", null)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        return { success: false, error: "Failed to fetch pending invitations" };
      }

      const pendingInvitations: PendingInvitation[] = (invitations || []).map(
        (inv: SupabasePendingInvitationResponse) => ({
          id: inv.id,
          email: inv.email,
          campaignId: inv.campaign_id,
          campaignName: inv.campaigns?.name,
          invitedBy: inv.invited_by,
          inviterName: undefined, // TODO: Fetch inviter details separately if needed
          role: inv.role as CampaignRole,
          createdAt: new Date(inv.created_at || ""),
          expiresAt: new Date(inv.expires_at || ""),
          acceptedAt: inv.accepted_at ? new Date(inv.accepted_at) : undefined,
        })
      );

      return { success: true, data: pendingInvitations };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async acceptPendingInvitation(
    invitationId: string,
    userId: string
  ): Promise<OperationResult> {
    try {
      // Get the invitation details
      const { data: invitation, error: getError } = await supabase
        .from("pending_invitations")
        .select("*")
        .eq("id", invitationId)
        .is("accepted_at", null)
        .gte("expires_at", new Date().toISOString())
        .single();

      if (getError || !invitation) {
        return { success: false, error: "Invitation not found or expired" };
      }

      // Check if user is already a member of the campaign
      const { data: existingMember } = await supabase
        .from("campaign_members")
        .select("id")
        .eq("campaign_id", invitation.campaign_id)
        .eq("user_id", userId)
        .single();

      if (existingMember) {
        // Mark invitation as accepted anyway
        await supabase
          .from("pending_invitations")
          .update({ accepted_at: new Date().toISOString() })
          .eq("id", invitationId);

        return {
          success: false,
          error: "You are already a member of this campaign",
        };
      }

      // Add user to campaign
      const { error: addError } = await supabase
        .from("campaign_members")
        .insert({
          campaign_id: invitation.campaign_id,
          user_id: userId,
          is_admin: invitation.role === "admin",
          is_gm: invitation.role === "gm",
          is_player: invitation.role === "player",
        });

      if (addError) {
        return { success: false, error: "Failed to add you to the campaign" };
      }

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from("pending_invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitationId);

      if (updateError) {
        // The user was added but we couldn't mark the invitation as accepted
        // This is not a critical error - we could log this to a proper logging system
        // in production instead of using console
      }

      return { success: true };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async declinePendingInvitation(
    invitationId: string
  ): Promise<OperationResult> {
    try {
      const { error } = await supabase
        .from("pending_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) {
        return { success: false, error: "Failed to decline invitation" };
      }

      return { success: true };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async cancelPendingInvitation(
    invitationId: string
  ): Promise<OperationResult> {
    try {
      const { error } = await supabase
        .from("pending_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) {
        return { success: false, error: "Failed to cancel invitation" };
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
      const rolesResult = await this.getUserRoles(campaignId, userId);
      if (!rolesResult.success || !rolesResult.data) {
        return {
          success: false,
          error: rolesResult.error || "User is not a member of this campaign",
        };
      }

      const roles = rolesResult.data;
      // Return the highest role for backward compatibility
      let primaryRole: CampaignRole;
      if (roles.isAdmin) {
        primaryRole = "admin";
      } else if (roles.isGm) {
        primaryRole = "gm";
      } else {
        primaryRole = "player";
      }

      return { success: true, data: primaryRole };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async getUserRoles(
    campaignId: string,
    userId: string
  ): Promise<OperationResult<CampaignRoles>> {
    try {
      const { data, error } = await supabase
        .from("campaign_members")
        .select("is_admin, is_gm, is_player")
        .eq("campaign_id", campaignId)
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        return {
          success: false,
          error: "User is not a member of this campaign",
        };
      }

      const memberData = data as unknown as {
        is_admin: boolean;
        is_gm: boolean;
        is_player: boolean;
      };

      return {
        success: true,
        data: {
          isAdmin: memberData.is_admin || false,
          isGm: memberData.is_gm || false,
          isPlayer: memberData.is_player || false,
        },
      };
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
          characteristics: { STR: 0, DEX: 0, END: 0, INT: 0, EDU: 0, SOC: 0 },
          skills: [],
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

  async updateCharacter(
    characterId: string,
    updates: Partial<{
      name: string;
      player_name: string;
      character_name: string;
      characteristics: {
        STR: { value: number; xp: number };
        DEX: { value: number; xp: number };
        END: { value: number; xp: number };
        INT: { value: number; xp: number };
        EDU: { value: number; xp: number };
        SOC: { value: number; xp: number };
      };
      skills: Array<{ name: string; level: number; xp?: number }>;
    }>
  ) {
    try {
      const { error } = await supabase
        .from("characters")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", characterId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  // Standalone Character Management
  async createStandaloneCharacter(
    userId: string,
    request: CreateCharacterRequest
  ): Promise<OperationResult<Character>> {
    try {
      const { data, error } = await supabase.rpc(
        "create_standalone_character",
        {
          user_id: userId,
          char_name: request.name,
          player_name: request.playerName || undefined,
          character_name: request.characterName || undefined,
        }
      );

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: CharacterMapper.toDomain(data as Record<string, unknown>),
      };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async getStandaloneCharacters(
    userId: string
  ): Promise<OperationResult<Character[]>> {
    try {
      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .eq("owner_id", userId)
        .is("campaign_id", null)
        .order("created_at", { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: CharacterMapper.toDomainList(data || []) };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async deleteStandaloneCharacter(
    characterId: string,
    userId: string
  ): Promise<OperationResult<void>> {
    try {
      // First check if the user owns this standalone character
      const { data: character, error: fetchError } = await supabase
        .from("characters")
        .select("owner_id, campaign_id")
        .eq("id", characterId)
        .single();

      if (fetchError || !character) {
        return { success: false, error: "Character not found" };
      }

      // Check if it's a standalone character and user owns it
      if (character.campaign_id !== null) {
        return { success: false, error: "This is not a standalone character" };
      }

      if (character.owner_id !== userId) {
        return {
          success: false,
          error: "You don't have permission to delete this character",
        };
      }

      const { error: deleteError } = await supabase
        .from("characters")
        .delete()
        .eq("id", characterId);

      if (deleteError) {
        return { success: false, error: deleteError.message };
      }

      return { success: true };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async assignCharacterToCampaign(
    characterId: string,
    campaignId: string,
    userId: string
  ): Promise<OperationResult<void>> {
    try {
      // First check if the user owns this character
      const { data: character, error: fetchError } = await supabase
        .from("characters")
        .select("owner_id, campaign_id")
        .eq("id", characterId)
        .single();

      if (fetchError || !character) {
        return { success: false, error: "Character not found" };
      }

      if (character.owner_id !== userId) {
        return {
          success: false,
          error: "You don't have permission to move this character",
        };
      }

      // Check if character is already in a campaign
      if (character.campaign_id !== null) {
        return {
          success: false,
          error: "Character is already assigned to a campaign",
        };
      }

      // Verify user is a member of the target campaign
      const { data: membership, error: membershipError } = await supabase
        .from("campaign_members")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("user_id", userId)
        .single();

      if (membershipError || !membership) {
        return {
          success: false,
          error: "You are not a member of this campaign",
        };
      }

      // Update the character to assign it to the campaign
      const { error: updateError } = await supabase
        .from("characters")
        .update({ campaign_id: campaignId })
        .eq("id", characterId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  // Campaign Invitation Management
  async createCampaignInvitation(
    campaignId: string,
    invitedEmail: string,
    invitedBy: string,
    rolesOffered: CampaignRoles
  ): Promise<OperationResult<string>> {
    try {
      const { data, error } = await supabase.rpc("create_campaign_invitation", {
        p_campaign_id: campaignId,
        p_invited_email: invitedEmail,
        p_invited_by: invitedBy,
        p_roles_offered: JSON.stringify(rolesOffered),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data as string };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async getUserInvitations(
    userEmail: string
  ): Promise<OperationResult<CampaignInvitation[]>> {
    try {
      const { data, error } = await supabase.rpc("get_user_invitations", {
        p_user_email: userEmail,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Transform the raw data to match our CampaignInvitation interface
      const invitations = Array.isArray(data)
        ? data.map((item: Record<string, unknown>) => ({
          id: item.id as string,
          campaignId: item.campaign_id as string,
          campaignName: item.campaign_name as string,
          invitedEmail: item.invited_email as string,
          invitedBy: item.invited_by as string,
          invitedByName: item.inviter_name as string,
          rolesOffered:
            typeof item.roles_offered === "string"
              ? JSON.parse(item.roles_offered as string)
              : (item.roles_offered as CampaignRoles),
          status: item.status as
            | "pending"
            | "accepted"
            | "declined"
            | "expired",
          expiresAt: item.expires_at
            ? new Date(item.expires_at as string)
            : null,
          createdAt: new Date(item.created_at as string),
          acceptedAt: item.accepted_at
            ? new Date(item.accepted_at as string)
            : null,
        }))
        : [];

      return { success: true, data: invitations };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async acceptCampaignInvitation(
    invitationId: string,
    userId: string
  ): Promise<OperationResult<boolean>> {
    try {
      const { data, error } = await supabase.rpc("accept_campaign_invitation", {
        p_invitation_id: invitationId,
        p_user_id: userId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data as boolean };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async declineCampaignInvitation(
    invitationId: string
  ): Promise<OperationResult<boolean>> {
    try {
      const { data, error } = await supabase.rpc(
        "decline_campaign_invitation",
        {
          p_invitation_id: invitationId,
        }
      );

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data as boolean };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  async deleteCharacter(characterId: string, userId: string) {
    try {
      // First check if the user owns this character or has permission to delete it
      const { data: character, error: fetchError } = await supabase
        .from("characters")
        .select("owner_id, campaign_id, campaigns!inner(created_by)")
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
export { SupabaseCharacterRepository } from "./SupabaseCharacterRepository";
export { SupabaseCampaignDataRepository } from "./SupabaseCampaignDataRepository";
