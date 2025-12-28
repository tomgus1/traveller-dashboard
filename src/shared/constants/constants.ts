// Simple character type
export interface SimpleCharacter {
  id: string;
  campaignId: string | null; // NULL for standalone characters
  displayName: string; // Combined "Player – Character" format
  playerName: string;
  characterName: string;
  ownerId?: string;
  // Traveller Characteristics (0-15 standard range)
  stats?: {
    STR: number;
    DEX: number;
    END: number;
    INT: number;
    EDU: number;
    SOC: number;
  };
}
