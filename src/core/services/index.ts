// Business logic services - orchestrate operations and enforce rules
import type {
  User,
  Campaign,
  CampaignWithMeta,
  CampaignRole,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  MemberInfo,
  OperationResult,
} from "../entities";
import type { AuthRepository, CampaignRepository } from "../repositories";

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

    if (!this.isValidEmail(email)) {
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

    if (!this.isValidEmail(email)) {
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

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

    // Validate input
    if (!request.name?.trim()) {
      return { success: false, error: "Campaign name is required" };
    }

    if (request.name.length > 100) {
      return {
        success: false,
        error: "Campaign name must be 100 characters or less",
      };
    }

    return this.campaignRepository.createCampaign(user.id, {
      name: request.name.trim(),
      description: request.description?.trim(),
    });
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
    if (!roleResult.success || roleResult.data !== "admin") {
      return {
        success: false,
        error: "Only administrators can update campaigns",
      };
    }

    // Validate input
    if (request.name !== undefined && !request.name?.trim()) {
      return { success: false, error: "Campaign name cannot be empty" };
    }

    if (request.name && request.name.length > 100) {
      return {
        success: false,
        error: "Campaign name must be 100 characters or less",
      };
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
    if (!roleResult.success || roleResult.data !== "admin") {
      return {
        success: false,
        error: "Only administrators can delete campaigns",
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

    // Check admin permission
    const roleResult = await this.campaignRepository.getUserRole(
      campaignId,
      user.id
    );
    if (!roleResult.success || roleResult.data !== "admin") {
      return { success: false, error: "Only administrators can add members" };
    }

    // Validate input
    if (!email?.trim()) {
      return { success: false, error: "Email is required" };
    }

    if (!this.isValidEmail(email)) {
      return { success: false, error: "Invalid email format" };
    }

    if (!["admin", "gm", "player"].includes(role)) {
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
    role: CampaignRole
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
    if (!roleResult.success || roleResult.data !== "admin") {
      return {
        success: false,
        error: "Only administrators can update member roles",
      };
    }

    // Validate input
    if (!["admin", "gm", "player"].includes(role)) {
      return { success: false, error: "Invalid role specified" };
    }

    return this.campaignRepository.updateMemberRole(campaignId, userId, role);
  }

  async removeMember(
    campaignId: string,
    userId: string
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
    if (!roleResult.success || roleResult.data !== "admin") {
      return {
        success: false,
        error: "Only administrators can remove members",
      };
    }

    return this.campaignRepository.removeMember(campaignId, userId);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
