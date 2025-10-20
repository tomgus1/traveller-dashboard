// Domain entities - pure business objects without external dependencies

export interface User {
  id: string;
  email: string;
  displayName?: string;
  username?: string;
  profileCompleted?: boolean;
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
  roles: CampaignRoles;
  joinedAt: Date;
}

export interface CampaignRoles {
  isAdmin: boolean;
  isGm: boolean;
  isPlayer: boolean;
}

export type CampaignRole = "admin" | "gm" | "player"; // Keep for backward compatibility during transition

export interface CampaignWithMeta extends Campaign {
  userRoles: CampaignRoles;
  memberCount: number;
  isOwner: boolean;
}

export interface PendingInvitation {
  id: string;
  email: string;
  campaignId: string;
  campaignName?: string; // Populated when fetching with campaign details
  invitedBy: string;
  inviterName?: string; // Populated when fetching with inviter details
  role: CampaignRole;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
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
  creatorIsAlsoGM?: boolean; // Creator is always admin, but can optionally also be GM
  initialMembers?: Array<{ email: string; role: CampaignRole }>;
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
  roles: CampaignRoles;
  joinedAt: Date;
}

// Character entities
export interface Character {
  id: string;
  campaignId: string | null; // NULL for standalone characters
  name: string;
  playerName?: string; // Real player name
  characterName?: string; // Character name
  ownerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCharacterRequest {
  campaignId?: string | null; // Optional for standalone characters
  name: string;
  playerName?: string;
  characterName?: string;
}

export interface CampaignInvitation {
  id: string;
  campaignId: string;
  campaignName?: string; // Filled when fetching
  invitedEmail: string;
  invitedBy: string;
  invitedByName?: string; // Filled when fetching
  rolesOffered: CampaignRoles;
  status: "pending" | "accepted" | "declined" | "expired";
  expiresAt: Date | null;
  createdAt: Date;
  acceptedAt: Date | null;
}

export interface CharacterFinance {
  id: string;
  characterId: string;
  description: string;
  amount: number;
  transactionDate: Date;
  createdAt: Date;
}

export interface CharacterInventory {
  id: string;
  characterId: string;
  itemName: string;
  quantity: number;
  weight?: number;
  value?: number;
  description?: string;
  createdAt: Date;
}

export interface CharacterWeapon {
  id: string;
  characterId: string;
  name: string;
  damage?: string;
  range?: string;
  weight?: number;
  cost?: number;
  notes?: string;
  createdAt: Date;
}

export interface CharacterArmour {
  id: string;
  characterId: string;
  name: string;
  protection?: number;
  weight?: number;
  cost?: number;
  notes?: string;
  createdAt: Date;
}

export interface CharacterAmmo {
  id: string;
  characterId: string;
  type: string;
  quantity: number;
  maxQuantity?: number;
  weaponCompatibility?: string;
  notes?: string;
  createdAt: Date;
}

// Character operations
export interface UpdateCharacterRequest {
  name?: string;
  playerName?: string;
  characterName?: string;
}

// User profile operations
export interface CompleteProfileRequest {
  displayName: string;
  username: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  username?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: "weak" | "medium" | "strong";
}
