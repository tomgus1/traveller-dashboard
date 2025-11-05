export type ArmourType =
  | "Light"
  | "Medium"
  | "Heavy"
  | "Vacc Suit"
  | "Environment"
  | "Shield"
  | "Accessory"
  | "Undersuit";

export type ArmourTrait =
  | "Ablative"
  | "Bulky"
  | "Concealed"
  | "Environment"
  | "Laser Only"
  | "Melee"
  | "NBC"
  | "Powered"
  | "Sealed"
  | "Zero-G"
  | "Breathing";

export interface TravellerArmour {
  name: string;
  type: ArmourType;
  protection: number;
  protectionType?: string;
  mass: number;
  cost: number;
  tl: number;
  traits: string[];
  notes: string;
}

export interface ArmourDatabase {
  armour: TravellerArmour[];
  armourTypes: ArmourType[];
  traits: Record<string, string>;
}
