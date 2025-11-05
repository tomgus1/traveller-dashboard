import { useMemo } from "react";
import weaponsData from "../data/traveller-weapons.json";
import type {
  TravellerWeapon,
  WeaponsDatabase,
} from "../data/traveller-weapons.types";

export function useTravellerWeapons() {
  const weapons = useMemo(() => weaponsData as WeaponsDatabase, []);

  // Get all weapons
  const getAllWeapons = (): TravellerWeapon[] => {
    return weapons.weapons;
  };

  // Get weapons by type
  const getWeaponsByType = (type: string): TravellerWeapon[] => {
    return weapons.weapons.filter((weapon) => weapon.type === type);
  };

  // Get weapon by name
  const getWeaponByName = (name: string): TravellerWeapon | undefined => {
    return weapons.weapons.find((weapon) => weapon.name === name);
  };

  // Get all weapon types
  const getWeaponTypes = (): string[] => {
    return weapons.weaponTypes;
  };

  // Get weapons by tech level
  const getWeaponsByTechLevel = (
    minTL: number,
    maxTL?: number
  ): TravellerWeapon[] => {
    return weapons.weapons.filter((weapon) => {
      if (maxTL !== undefined) {
        return weapon.tl >= minTL && weapon.tl <= maxTL;
      }
      return weapon.tl >= minTL;
    });
  };

  // Get trait descriptions
  const getTraitDescription = (trait: string): string | undefined => {
    return weapons.traits[trait];
  };

  // Sort weapons by cost
  const sortWeaponsByCost = (ascending = true): TravellerWeapon[] => {
    const sorted = [...weapons.weapons].sort((a, b) => a.cost - b.cost);
    return ascending ? sorted : sorted.reverse();
  };

  return {
    getAllWeapons,
    getWeaponsByType,
    getWeaponByName,
    getWeaponTypes,
    getWeaponsByTechLevel,
    getTraitDescription,
    sortWeaponsByCost,
    weaponTypes: weapons.weaponTypes,
    traits: weapons.traits,
  };
}
