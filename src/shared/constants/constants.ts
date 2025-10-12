// Simple character type
export interface SimpleCharacter {
  id: string;
  campaignId: string;
  displayName: string; // Combined "Player – Character" format
  playerName: string;
  characterName: string;
  ownerId?: string;
}
