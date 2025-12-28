import { ServiceContainer } from "../core/container";
import {
    SupabaseAuthRepository,
    SupabaseCampaignRepository,
    SupabaseCharacterRepository,
} from "./database";
import { SupabaseCampaignDataRepository } from "../core/repositories/CampaignDataRepository";
import { supabase } from "./database/supabase";

/**
 * Initialize the core service container with infrastructure implementations.
 * This is the composition root of the application.
 */
export function initInfrastructure(): void {
    const container = ServiceContainer.getInstance();

    container.init({
        authRepository: new SupabaseAuthRepository(),
        campaignRepository: new SupabaseCampaignRepository(),
        characterRepository: new SupabaseCharacterRepository(supabase),
        campaignDataRepository: new SupabaseCampaignDataRepository(supabase),
    });
}
