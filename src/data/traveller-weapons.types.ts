export type WeaponType =
  | "Slug Pistol"
  | "Slug Rifle"
  | "Energy Pistol"
  | "Energy Rifle"
  | "Heavy Weapon"
  | "Blade"
  | "Bludgeon"
  | "Grenade"
  | "Projectile"
  | "Special";

export type WeaponSource =
  | "Core Rulebook"
  | "High Guard"
  | "Central Supply Catalogue"
  | "Mercenary"
  | "Pirates of Drinax"
  | "Robot Handbook"
  | "Vehicle Handbook"
  | "Other";

export type WeaponTrait =
  | "AP"
  | "Auto"
  | "Blast"
  | "Bulky"
  | "Fire"
  | "Illegal"
  | "Radiation"
  | "Reach"
  | "Scope"
  | "Silent"
  | "Smoke"
  | "Stun"
  | "Zero-G"
  | "Entangle";

export interface TravellerWeapon {
  name: string;
  type: WeaponType;
  damage: string;
  range: string;
  range_long?: string;
  mass: number;
  cost: number;
  magazine: number | null;
  traits: string[];
  tl: number;
  notes: string;
  source: WeaponSource;
}

export interface WeaponsDatabase {
  weapons: TravellerWeapon[];
  weaponTypes: WeaponType[];
  traits: Record<string, string>;
}
