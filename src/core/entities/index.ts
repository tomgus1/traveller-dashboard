// Domain entities - pure business objects without external dependencies

export interface User {
  id: string;
  email: string;
  displayName?: string;
  createdAt: Date;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignMember {
  id: string;
  campaignId: string;
  userId: string;
  role: CampaignRole;
  joinedAt: Date;
}

export type CampaignRole = "admin" | "gm" | "player";

export interface CampaignWithMeta extends Campaign {
  userRole?: CampaignRole;
  memberCount: number;
  isOwner: boolean;
}

// Authentication state
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Result types for operations
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// Campaign operations
export interface CreateCampaignRequest {
  name: string;
  description?: string;
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
}

export interface MemberInfo {
  id: string;
  userId: string;
  email: string;
  displayName?: string;
  role: CampaignRole;
  joinedAt: Date;
}
