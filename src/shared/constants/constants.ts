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
    STR: { value: number; xp: number };
    DEX: { value: number; xp: number };
    END: { value: number; xp: number };
    INT: { value: number; xp: number };
    EDU: { value: number; xp: number };
    SOC: { value: number; xp: number };
  };
  skills?: Array<{
    name: string;
    level: number;
  }>;
}
