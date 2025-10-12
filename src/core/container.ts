// Service container - dependency injection and service management
import { AuthService, CampaignService } from "./services";
import {
  SupabaseAuthRepository,
  SupabaseCampaignRepository,
} from "../infrastructure/database";

// Service container for dependency injection
export class ServiceContainer {
  private static instance: ServiceContainer;

  private _authRepository: SupabaseAuthRepository;
  private _campaignRepository: SupabaseCampaignRepository;
  private _authService: AuthService;
  private _campaignService: CampaignService;

  private constructor() {
    // Initialize repositories
    this._authRepository = new SupabaseAuthRepository();
    this._campaignRepository = new SupabaseCampaignRepository();

    // Initialize services with dependencies
    this._authService = new AuthService(this._authRepository);
    this._campaignService = new CampaignService(
      this._campaignRepository,
      this._authRepository
    );
  }

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  // Service getters
  get authService(): AuthService {
    return this._authService;
  }

  get campaignService(): CampaignService {
    return this._campaignService;
  }

  // Repository getters (for testing or direct access)
  get authRepository(): SupabaseAuthRepository {
    return this._authRepository;
  }

  get campaignRepository(): SupabaseCampaignRepository {
    return this._campaignRepository;
  }
}

// Convenience function to get services
export function getServices() {
  return ServiceContainer.getInstance();
}

// Individual service getters for convenience
export function getAuthService(): AuthService {
  return ServiceContainer.getInstance().authService;
}

export function getCampaignService(): CampaignService {
  return ServiceContainer.getInstance().campaignService;
}
