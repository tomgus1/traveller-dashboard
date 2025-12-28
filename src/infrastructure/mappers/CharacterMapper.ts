import type { Character } from "../../core/entities";

export class CharacterMapper {
    /**
     * Maps raw database records to domain Character entities.
     * Handles snake_case to camelCase conversion and Date instantiation.
     */
    static toDomain(raw: Record<string, unknown>): Character {
        if (!raw) {
            throw new Error("Cannot map null character data");
        }

        return {
            id: raw.id as string,
            campaignId: (raw.campaign_id as string | null) || null,
            name: (raw.name as string) || "Unknown Character",
            playerName: (raw.player_name as string) || undefined,
            characterName: (raw.character_name as string) || undefined,
            ownerId: (raw.owner_id as string) || undefined,
            createdAt: raw.created_at ? new Date(raw.created_at as string) : new Date(),
            updatedAt: raw.updated_at ? new Date(raw.updated_at as string) : new Date(),
        };
    }

    /**
     * Maps a list of raw database records to a list of domain Character entities.
     */
    static toDomainList(rawList: Record<string, unknown>[]): Character[] {
        return (rawList || []).map((item) => this.toDomain(item));
    }
}
