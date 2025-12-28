// Service container - dependency injection and service management
import { AuthService, CampaignService } from "./services";
import type {
  AuthRepository,
  CampaignRepository,
  CharacterRepository,
  CampaignDataRepository,
} from "./repositories";

export interface ContainerDependencies {
  authRepository: AuthRepository;
  campaignRepository: CampaignRepository;
  characterRepository: CharacterRepository;
  campaignDataRepository: CampaignDataRepository;
}

// Service container for dependency injection
export class ServiceContainer {
  private static instance: ServiceContainer;

  private _authRepository?: AuthRepository;
  private _campaignRepository?: CampaignRepository;
  private _campaignDataRepository?: CampaignDataRepository;
  private _characterRepository?: CharacterRepository;
  private _authService?: AuthService;
  private _campaignService?: CampaignService;

  private constructor() { }

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Initialize the container with concrete implementations.
   * This should be called once at application startup (Composition Root).
   */
  public init(deps: ContainerDependencies): void {
    this._authRepository = deps.authRepository;
    this._campaignRepository = deps.campaignRepository;
    this._campaignDataRepository = deps.campaignDataRepository;
    this._characterRepository = deps.characterRepository;

    // Initialize services with dependencies
    this._authService = new AuthService(this._authRepository);
    this._campaignService = new CampaignService(
      this._campaignRepository,
      this._authRepository
    );
  }

  private ensureInitialized(): void {
    if (!this._authService) {
      throw new Error("ServiceContainer not initialized. Call init() first.");
    }
  }

  // Service getters
  get authService(): AuthService {
    this.ensureInitialized();
    return this._authService!;
  }

  get campaignService(): CampaignService {
    this.ensureInitialized();
    return this._campaignService!;
  }

  // Repository getters
  get authRepository(): AuthRepository {
    this.ensureInitialized();
    return this._authRepository!;
  }

  get campaignRepository(): CampaignRepository {
    this.ensureInitialized();
    return this._campaignRepository!;
  }

  get campaignDataRepository(): CampaignDataRepository {
    this.ensureInitialized();
    return this._campaignDataRepository!;
  }

  get characterRepository(): CharacterRepository {
    this.ensureInitialized();
    return this._characterRepository!;
  }
}

// Individual service getters for convenience
export function getAuthService(): AuthService {
  return ServiceContainer.getInstance().authService;
}

export function getCampaignService(): CampaignService {
  return ServiceContainer.getInstance().campaignService;
}

export function getCampaignRepository(): CampaignRepository {
  return ServiceContainer.getInstance().campaignRepository;
}

export function getCampaignDataRepository(): CampaignDataRepository {
  return ServiceContainer.getInstance().campaignDataRepository;
}

export function getCharacterRepository(): CharacterRepository {
  return ServiceContainer.getInstance().characterRepository;
}
