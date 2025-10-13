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

// Character entities
export interface Character {
  id: string;
  campaignId: string;
  name: string;
  playerName?: string; // Real player name
  characterName?: string; // Character name
  ownerId?: string;
  createdAt: Date;
  updatedAt: Date;
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
export interface CreateCharacterRequest {
  campaignId: string;
  name: string;
  playerName?: string;
  characterName?: string;
}

export interface UpdateCharacterRequest {
  name?: string;
  playerName?: string;
  characterName?: string;
}
