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
  campaignDataRepository: CampaignDataRepository;
  characterRepository: CharacterRepository;
}

export class ServiceContainer {
  private static instance: ServiceContainer;

  private _authRepository?: AuthRepository;
  private _campaignRepository?: CampaignRepository;
  private _campaignDataRepository?: CampaignDataRepository;
  private _characterRepository?: CharacterRepository;
  private _authService?: AuthService;
  private _campaignService?: CampaignService;

  private constructor() {
    // Private constructor for singleton pattern
  }

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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this._authService!;
  }

  get campaignService(): CampaignService {
    this.ensureInitialized();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this._campaignService!;
  }

  // Repository getters
  get authRepository(): AuthRepository {
    this.ensureInitialized();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this._authRepository!;
  }

  get campaignRepository(): CampaignRepository {
    this.ensureInitialized();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this._campaignRepository!;
  }

  get campaignDataRepository(): CampaignDataRepository {
    this.ensureInitialized();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this._campaignDataRepository!;
  }

  get characterRepository(): CharacterRepository {
    this.ensureInitialized();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this._characterRepository!;
  }
}

export const getAuthService = () => ServiceContainer.getInstance().authService;
export const getCampaignService = () =>
  ServiceContainer.getInstance().campaignService;
export const getCampaignRepository = () =>
  ServiceContainer.getInstance().campaignRepository;
export const getCharacterRepository = () =>
  ServiceContainer.getInstance().characterRepository;
export const getCampaignDataRepository = () =>
  ServiceContainer.getInstance().campaignDataRepository;
