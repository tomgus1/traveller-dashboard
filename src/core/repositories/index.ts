// Repository interfaces - data access contracts without implementation details
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

export interface AuthRepository {
  getCurrentUser(): Promise<User | null>;
  signIn(email: string, password: string): Promise<OperationResult<User>>;
  signUp(email: string, password: string): Promise<OperationResult<User>>;
  signOut(): Promise<OperationResult>;
  onAuthStateChange(callback: (user: User | null) => void): () => void;
}

export interface CampaignRepository {
  getCampaigns(userId: string): Promise<OperationResult<CampaignWithMeta[]>>;
  getCampaign(campaignId: string): Promise<OperationResult<Campaign>>;
  createCampaign(
    userId: string,
    request: CreateCampaignRequest
  ): Promise<OperationResult<Campaign>>;
  updateCampaign(
    campaignId: string,
    request: UpdateCampaignRequest
  ): Promise<OperationResult>;
  deleteCampaign(campaignId: string): Promise<OperationResult>;

  // Member management
  getCampaignMembers(
    campaignId: string
  ): Promise<OperationResult<MemberInfo[]>>;
  addMemberByEmail(
    campaignId: string,
    email: string,
    role: CampaignRole
  ): Promise<OperationResult>;
  updateMemberRole(
    campaignId: string,
    userId: string,
    role: CampaignRole
  ): Promise<OperationResult>;
  removeMember(campaignId: string, userId: string): Promise<OperationResult>;

  // Permission checks
  getUserRole(
    campaignId: string,
    userId: string
  ): Promise<OperationResult<CampaignRole>>;
  canUserAccessCampaign(
    campaignId: string,
    userId: string
  ): Promise<OperationResult<boolean>>;
}
