import { useMemo } from "react";
import armourData from "../data/traveller-armour.json";
import type {
  TravellerArmour,
  ArmourDatabase,
} from "../data/traveller-armour.types";

export function useTravellerArmour() {
  const armour = useMemo(() => armourData as ArmourDatabase, []);

  // Get all armour
  const getAllArmour = (): TravellerArmour[] => {
    return armour.armour;
  };

  // Get armour by type
  const getArmourByType = (type: string): TravellerArmour[] => {
    return armour.armour.filter((item) => item.type === type);
  };

  // Get armour by name
  const getArmourByName = (name: string): TravellerArmour | undefined => {
    return armour.armour.find((item) => item.name === name);
  };

  // Get all armour types
  const getArmourTypes = (): string[] => {
    return armour.armourTypes;
  };

  // Get armour by tech level
  const getArmourByTechLevel = (
    minTL: number,
    maxTL?: number
  ): TravellerArmour[] => {
    return armour.armour.filter((item) => {
      if (maxTL !== undefined) {
        return item.tl >= minTL && item.tl <= maxTL;
      }
      return item.tl >= minTL;
    });
  };

  // Get trait descriptions
  const getTraitDescription = (trait: string): string | undefined => {
    return armour.traits[trait];
  };

  // Sort armour by cost
  const sortArmourByCost = (ascending = true): TravellerArmour[] => {
    const sorted = [...armour.armour].sort((a, b) => a.cost - b.cost);
    return ascending ? sorted : sorted.reverse();
  };

  // Sort armour by protection
  const sortArmourByProtection = (ascending = true): TravellerArmour[] => {
    const sorted = [...armour.armour].sort(
      (a, b) => a.protection - b.protection
    );
    return ascending ? sorted : sorted.reverse();
  };

  return {
    getAllArmour,
    getArmourByType,
    getArmourByName,
    getArmourTypes,
    getArmourByTechLevel,
    getTraitDescription,
    sortArmourByCost,
    sortArmourByProtection,
    armourTypes: armour.armourTypes,
    traits: armour.traits,
  };
}
