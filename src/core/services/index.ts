// Business logic services - orchestrate operations and enforce rules
import type {
  User,
  Campaign,
  CampaignWithMeta,
  CampaignRole,
  CampaignRoles,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  MemberInfo,
  OperationResult,
  CompleteProfileRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from "../entities";
import type { AuthRepository, CampaignRepository } from "../repositories";
import {
  isValidEmail,
  validateUsername,
  validatePassword,
  validateCampaignName,
  isValidCampaignRole,
} from "../../shared/utils/validation";
import {
  canManageMembers,
  canUpdateCampaign,
  canDeleteCampaign,
  getPermissionError,
  isValidRoleCombination,
} from "../../shared/utils/permissions";

export class AuthService {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  async getCurrentUser(): Promise<User | null> {
    return this.authRepository.getCurrentUser();
  }

  async signIn(
    email: string,
    password: string
  ): Promise<OperationResult<User>> {
    // Validate input
    if (!email || !password) {
      return { success: false, error: "Email and password are required" };
    }

    if (!isValidEmail(email)) {
      return { success: false, error: "Invalid email format" };
    }

    return this.authRepository.signIn(email, password);
  }

  async signUp(
    email: string,
    password: string
  ): Promise<OperationResult<User>> {
    // Validate input
    if (!email || !password) {
      return { success: false, error: "Email and password are required" };
    }

    if (!isValidEmail(email)) {
      return { success: false, error: "Invalid email format" };
    }

    if (password.length < 6) {
      return {
        success: false,
        error: "Password must be at least 6 characters",
      };
    }

    return this.authRepository.signUp(email, password);
  }

  async signOut(): Promise<OperationResult> {
    return this.authRepository.signOut();
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return this.authRepository.onAuthStateChange(callback);
  }

  // Profile management
  async completeProfile(
    request: CompleteProfileRequest
  ): Promise<OperationResult<User>> {
    const user = await this.authRepository.getCurrentUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Validate display name
    if (!request.displayName?.trim()) {
      return { success: false, error: "Display name is required" };
    }

    // Validate username
    const usernameValidation = validateUsername(request.username);
    if (!usernameValidation.isValid) {
      return { success: false, error: usernameValidation.error };
    }

    return this.authRepository.completeProfile(
      user.id,
      request.displayName.trim(),
      request.username.trim()
    );
  }

  async updateProfile(
    request: UpdateProfileRequest
  ): Promise<OperationResult<User>> {
    const user = await this.authRepository.getCurrentUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Validate display name if provided
    if (request.displayName !== undefined && !request.displayName?.trim()) {
      return { success: false, error: "Display name cannot be empty" };
    }

    // Validate username if provided
    if (request.username !== undefined) {
      const usernameValidation = validateUsername(request.username);
      if (!usernameValidation.isValid) {
        return { success: false, error: usernameValidation.error };
      }
    }

    return this.authRepository.updateProfile(
      user.id,
      request.displayName?.trim(),
      request.username?.trim()
    );
  }

  async changePassword(
    request: ChangePasswordRequest
  ): Promise<OperationResult> {
    const user = await this.authRepository.getCurrentUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Validate input
    if (!request.currentPassword) {
      return { success: false, error: "Current password is required" };
    }

    // Validate new password
    const passwordValidation = validatePassword(request.newPassword);
    if (!passwordValidation.isValid) {
      return { success: false, error: passwordValidation.error };
    }

    return this.authRepository.changePassword(
      user.id,
      request.currentPassword,
      request.newPassword
    );
  }

  async deleteAccount(): Promise<OperationResult> {
    const user = await this.authRepository.getCurrentUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    return this.authRepository.deleteAccount(user.id);
  }
}

export class CampaignService {
  private campaignRepository: CampaignRepository;
  private authRepository: AuthRepository;

  constructor(
    campaignRepository: CampaignRepository,
    authRepository: AuthRepository
  ) {
    this.campaignRepository = campaignRepository;
    this.authRepository = authRepository;
  }

  async getCampaigns(): Promise<OperationResult<CampaignWithMeta[]>> {
    const user = await this.authRepository.getCurrentUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    return this.campaignRepository.getCampaigns(user.id);
  }

  async getCampaign(campaignId: string): Promise<OperationResult<Campaign>> {
    const user = await this.authRepository.getCurrentUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Check access permission
    const accessResult = await this.campaignRepository.canUserAccessCampaign(
      campaignId,
      user.id
    );
    if (!accessResult.success || !accessResult.data) {
      return { success: false, error: "Access denied to this campaign" };
    }

    return this.campaignRepository.getCampaign(campaignId);
  }

  async createCampaign(
    request: CreateCampaignRequest
  ): Promise<OperationResult<Campaign>> {
    const user = await this.authRepository.getCurrentUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Validate campaign name
    const nameValidation = validateCampaignName(request.name);
    if (!nameValidation.isValid) {
      return { success: false, error: nameValidation.error };
    }

    // Creator is always admin, but can optionally also be GM
    const creatorIsAlsoGM = request.creatorIsAlsoGM || false;

    // Validate initial members
    if (request.initialMembers) {
      for (const member of request.initialMembers) {
        if (!isValidEmail(member.email)) {
          return {
            success: false,
            error: `Invalid email format: ${member.email}`,
          };
        }
        if (!isValidCampaignRole(member.role)) {
          return { success: false, error: `Invalid role: ${member.role}` };
        }
      }
    }

    // Create the campaign
    const campaignResult = await this.campaignRepository.createCampaign(
      user.id,
      {
        name: request.name.trim(),
        description: request.description?.trim(),
      },
      creatorIsAlsoGM
    );

    if (!campaignResult.success) {
      return campaignResult;
    }

    // Add initial members if provided
    if (
      request.initialMembers &&
      request.initialMembers.length > 0 &&
      campaignResult.data
    ) {
      for (const member of request.initialMembers) {
        await this.campaignRepository.addMemberByEmail(
          campaignResult.data.id,
          member.email.trim(),
          member.role
        );
        // Note: We don't fail the campaign creation if member addition fails
        // This allows the campaign to be created even if some email addresses are invalid
      }
    }

    return campaignResult;
  }

  async updateCampaign(
    campaignId: string,
    request: UpdateCampaignRequest
  ): Promise<OperationResult> {
    const user = await this.authRepository.getCurrentUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Check admin permission
    const roleResult = await this.campaignRepository.getUserRole(
      campaignId,
      user.id
    );
    if (
      !roleResult.success ||
      !roleResult.data ||
      !canUpdateCampaign(roleResult.data)
    ) {
      return {
        success: false,
        error: getPermissionError("update campaigns", ["admin"]),
      };
    }

    // Validate campaign name if provided
    if (request.name !== undefined) {
      const nameValidation = validateCampaignName(request.name);
      if (!nameValidation.isValid) {
        return { success: false, error: nameValidation.error };
      }
    }

    const updateData: UpdateCampaignRequest = {};
    if (request.name !== undefined) {
      updateData.name = request.name.trim();
    }
    if (request.description !== undefined) {
      updateData.description = request.description?.trim();
    }

    return this.campaignRepository.updateCampaign(campaignId, updateData);
  }

  async deleteCampaign(campaignId: string): Promise<OperationResult> {
    const user = await this.authRepository.getCurrentUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Check admin permission
    const roleResult = await this.campaignRepository.getUserRole(
      campaignId,
      user.id
    );
    if (
      !roleResult.success ||
      !roleResult.data ||
      !canDeleteCampaign(roleResult.data)
    ) {
      return {
        success: false,
        error: getPermissionError("delete campaigns", ["admin"]),
      };
    }

    return this.campaignRepository.deleteCampaign(campaignId);
  }

  // Member management
  async getCampaignMembers(
    campaignId: string
  ): Promise<OperationResult<MemberInfo[]>> {
    const user = await this.authRepository.getCurrentUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Check access permission
    const accessResult = await this.campaignRepository.canUserAccessCampaign(
      campaignId,
      user.id
    );
    if (!accessResult.success || !accessResult.data) {
      return { success: false, error: "Access denied to this campaign" };
    }

    return this.campaignRepository.getCampaignMembers(campaignId);
  }

  async addMemberByEmail(
    campaignId: string,
    email: string,
    role: CampaignRole
  ): Promise<OperationResult> {
    const user = await this.authRepository.getCurrentUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Check admin or GM permission
    const roleResult = await this.campaignRepository.getUserRole(
      campaignId,
      user.id
    );
    if (
      !roleResult.success ||
      !roleResult.data ||
      !canManageMembers(roleResult.data)
    ) {
      return {
        success: false,
        error: getPermissionError("add members", ["admin", "gm"]),
      };
    }

    // Validate input
    if (!email?.trim()) {
      return { success: false, error: "Email is required" };
    }

    if (!isValidEmail(email)) {
      return { success: false, error: "Invalid email format" };
    }

    if (!isValidCampaignRole(role)) {
      return { success: false, error: "Invalid role specified" };
    }

    return this.campaignRepository.addMemberByEmail(
      campaignId,
      email.trim(),
      role
    );
  }

  async updateMemberRole(
    campaignId: string,
    userId: string,
    roles: CampaignRoles
  ): Promise<OperationResult> {
    const user = await this.authRepository.getCurrentUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Check admin or GM permission
    const roleResult = await this.campaignRepository.getUserRole(
      campaignId,
      user.id
    );
    if (
      !roleResult.success ||
      !roleResult.data ||
      !canManageMembers(roleResult.data)
    ) {
      return {
        success: false,
        error: getPermissionError("update member roles", ["admin", "gm"]),
      };
    }

    // Validate role combination
    if (!isValidRoleCombination(roles)) {
      return {
        success: false,
        error:
          "Invalid role combination. Must have at least one role and cannot be GM+Player without Admin.",
      };
    }

    return this.campaignRepository.updateMemberRole(campaignId, userId, roles);
  }

  async removeMember(
    campaignId: string,
    userId: string
  ): Promise<OperationResult> {
    const user = await this.authRepository.getCurrentUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Check admin or GM permission
    const roleResult = await this.campaignRepository.getUserRole(
      campaignId,
      user.id
    );
    if (
      !roleResult.success ||
      !roleResult.data ||
      !canManageMembers(roleResult.data)
    ) {
      return {
        success: false,
        error: getPermissionError("remove members", ["admin", "gm"]),
      };
    }

    return this.campaignRepository.removeMember(campaignId, userId);
  }
}
