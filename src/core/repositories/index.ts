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
  Character,
  CharacterFinance,
  CharacterInventory,
  CharacterWeapon,
  CharacterArmour,
  CharacterAmmo,
  CreateCharacterRequest,
  UpdateCharacterRequest,
} from "../entities";

export interface AuthRepository {
  getCurrentUser(): Promise<User | null>;
  signIn(email: string, password: string): Promise<OperationResult<User>>;
  signUp(email: string, password: string): Promise<OperationResult<User>>;
  signOut(): Promise<OperationResult>;
  onAuthStateChange(callback: (user: User | null) => void): () => void;

  // Profile management
  completeProfile(
    userId: string,
    displayName: string,
    username: string
  ): Promise<OperationResult<User>>;
  updateProfile(
    userId: string,
    displayName?: string,
    username?: string
  ): Promise<OperationResult<User>>;
  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<OperationResult>;
  deleteAccount(userId: string): Promise<OperationResult>;
}

export interface CampaignRepository {
  getCampaigns(userId: string): Promise<OperationResult<CampaignWithMeta[]>>;
  getCampaign(campaignId: string): Promise<OperationResult<Campaign>>;
  createCampaign(
    userId: string,
    request: CreateCampaignRequest,
    creatorIsAlsoGM?: boolean
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

export interface CharacterRepository {
  // Character management
  getCharacters(campaignId: string): Promise<OperationResult<Character[]>>;
  getCharacter(characterId: string): Promise<OperationResult<Character>>;
  createCharacter(
    userId: string,
    request: CreateCharacterRequest
  ): Promise<OperationResult<Character>>;
  updateCharacter(
    characterId: string,
    request: UpdateCharacterRequest
  ): Promise<OperationResult>;
  deleteCharacter(characterId: string): Promise<OperationResult>;

  // Character data management
  getCharacterFinance(
    characterId: string
  ): Promise<OperationResult<CharacterFinance[]>>;
  addCharacterFinance(
    characterId: string,
    description: string,
    amount: number
  ): Promise<OperationResult<CharacterFinance>>;
  updateCharacterFinance(
    financeId: string,
    description?: string,
    amount?: number
  ): Promise<OperationResult>;
  deleteCharacterFinance(financeId: string): Promise<OperationResult>;

  getCharacterInventory(
    characterId: string
  ): Promise<OperationResult<CharacterInventory[]>>;
  addCharacterInventory(
    characterId: string,
    item: Omit<CharacterInventory, "id" | "characterId" | "createdAt">
  ): Promise<OperationResult<CharacterInventory>>;
  updateCharacterInventory(
    inventoryId: string,
    updates: Partial<
      Omit<CharacterInventory, "id" | "characterId" | "createdAt">
    >
  ): Promise<OperationResult>;
  deleteCharacterInventory(inventoryId: string): Promise<OperationResult>;

  getCharacterWeapons(
    characterId: string
  ): Promise<OperationResult<CharacterWeapon[]>>;
  addCharacterWeapon(
    characterId: string,
    weapon: Omit<CharacterWeapon, "id" | "characterId" | "createdAt">
  ): Promise<OperationResult<CharacterWeapon>>;
  updateCharacterWeapon(
    weaponId: string,
    updates: Partial<Omit<CharacterWeapon, "id" | "characterId" | "createdAt">>
  ): Promise<OperationResult>;
  deleteCharacterWeapon(weaponId: string): Promise<OperationResult>;

  getCharacterArmour(
    characterId: string
  ): Promise<OperationResult<CharacterArmour[]>>;
  addCharacterArmour(
    characterId: string,
    armour: Omit<CharacterArmour, "id" | "characterId" | "createdAt">
  ): Promise<OperationResult<CharacterArmour>>;
  updateCharacterArmour(
    armourId: string,
    updates: Partial<Omit<CharacterArmour, "id" | "characterId" | "createdAt">>
  ): Promise<OperationResult>;
  deleteCharacterArmour(armourId: string): Promise<OperationResult>;

  getCharacterAmmo(
    characterId: string
  ): Promise<OperationResult<CharacterAmmo[]>>;
  addCharacterAmmo(
    characterId: string,
    ammo: Omit<CharacterAmmo, "id" | "characterId" | "createdAt">
  ): Promise<OperationResult<CharacterAmmo>>;
  updateCharacterAmmo(
    ammoId: string,
    updates: Partial<Omit<CharacterAmmo, "id" | "characterId" | "createdAt">>
  ): Promise<OperationResult>;
  deleteCharacterAmmo(ammoId: string): Promise<OperationResult>;
}
