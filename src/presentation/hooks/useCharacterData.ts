import { useState, useEffect, useCallback } from 'react';
import { getCharacterRepository } from '../../core/container';
import type {
  CharacterFinance,
  CharacterInventory,
  CharacterWeapon,
  CharacterArmour,
  CharacterAmmo,
} from '../../core/entities';
import type {
  FinanceRow,
  InventoryRow,
  WeaponRow,
  ArmourRow,
  AmmoRow,
} from '../../types';

/**
 * Custom hook for character data management with database persistence
 * Maps between app's FinanceRow/InventoryRow format and database entities
 */
export function useCharacterData(characterId: string | undefined) {
  const [finance, setFinance] = useState<FinanceRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [weapons, setWeapons] = useState<WeaponRow[]>([]);
  const [armour, setArmour] = useState<ArmourRow[]>([]);
  const [ammo, setAmmo] = useState<AmmoRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const repo = getCharacterRepository();

  // Load all character data on mount or when characterId changes
  useEffect(() => {
    if (!characterId) {
      setIsLoading(false);
      setFinance([]);
      setInventory([]);
      setWeapons([]);
      setArmour([]);
      setAmmo([]);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load all character data in parallel
        const [financeResult, inventoryResult, weaponsResult, armourResult, ammoResult] = 
          await Promise.all([
            repo.getCharacterFinance(characterId),
            repo.getCharacterInventory(characterId),
            repo.getCharacterWeapons(characterId),
            repo.getCharacterArmour(characterId),
            repo.getCharacterAmmo(characterId),
          ]);

        // Convert database entities to app row format
        if (financeResult.success && financeResult.data) {
          setFinance(financeResult.data.map(mapFinanceToRow));
        }

        if (inventoryResult.success && inventoryResult.data) {
          setInventory(inventoryResult.data.map(mapInventoryToRow));
        }

        if (weaponsResult.success && weaponsResult.data) {
          setWeapons(weaponsResult.data.map(mapWeaponToRow));
        }

        if (armourResult.success && armourResult.data) {
          setArmour(armourResult.data.map(mapArmourToRow));
        }

        if (ammoResult.success && ammoResult.data) {
          setAmmo(ammoResult.data.map(mapAmmoToRow));
        }

      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load character data:', err);
        setError(err instanceof Error ? err : new Error('Failed to load character data'));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]); // repo is singleton from container

  // ===================================================================
  // CHARACTER FINANCE
  // ===================================================================

  const updateFinance = useCallback(async (rows: FinanceRow[]) => {
    if (!characterId) return;
    
    // For now, just update local state
    // TODO: Implement proper sync strategy (detect changes, sync to DB)
    setFinance(rows);
  }, [characterId]);

  const addFinance = useCallback(async (description: string, amount: number) => {
    if (!characterId) return;
    
    try {
      const result = await repo.addCharacterFinance(characterId, description, amount);
      if (result.success && result.data) {
        const newRow = mapFinanceToRow(result.data);
        setFinance(prev => [newRow, ...prev]);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add finance:', err);
      throw err;
    }
  }, [characterId, repo]);

  // ===================================================================
  // CHARACTER INVENTORY
  // ===================================================================

  const addInventory = useCallback(async (item: InventoryRow) => {
    if (!characterId) return;
    
    try {
      const inventoryItem: Omit<CharacterInventory, 'id' | 'characterId' | 'createdAt'> = {
        itemName: item.Item,
        quantity: item.Qty || 1,
        weight: item['Unit Mass (kg)'],
        value: item['Unit Value (Cr)'],
        description: item.Notes,
      };

      const result = await repo.addCharacterInventory(characterId, inventoryItem);
      if (result.success && result.data) {
        const newRow = mapInventoryToRow(result.data);
        setInventory(prev => [...prev, newRow]);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add inventory:', err);
      throw err;
    }
  }, [characterId, repo]);

  // ===================================================================
  // CHARACTER WEAPONS
  // ===================================================================

  const addWeapon = useCallback(async (weapon: WeaponRow) => {
    if (!characterId) return;
    
    try {
      const weaponData: Omit<CharacterWeapon, 'id' | 'characterId' | 'createdAt'> = {
        name: weapon.Weapon,
        damage: weapon.Damage,
        range: weapon.Range,
        weight: typeof weapon.Mass === 'number' ? weapon.Mass : undefined,
        cost: weapon.Cost,
        notes: weapon.Notes,
      };

      const result = await repo.addCharacterWeapon(characterId, weaponData);
      if (result.success && result.data) {
        const newRow = mapWeaponToRow(result.data);
        setWeapons(prev => [...prev, newRow]);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add weapon:', err);
      throw err;
    }
  }, [characterId, repo]);

  // ===================================================================
  // CHARACTER ARMOUR
  // ===================================================================

  const addArmour = useCallback(async (armourItem: ArmourRow) => {
    if (!characterId) return;
    
    try {
      const armourData: Omit<CharacterArmour, 'id' | 'characterId' | 'createdAt'> = {
        name: armourItem.Armour,
        protection: typeof armourItem.Protection === 'number' ? armourItem.Protection : undefined,
        weight: typeof armourItem.Mass === 'number' ? armourItem.Mass : undefined,
        cost: armourItem.Cost,
        notes: armourItem.Notes,
      };

      const result = await repo.addCharacterArmour(characterId, armourData);
      if (result.success && result.data) {
        const newRow = mapArmourToRow(result.data);
        setArmour(prev => [...prev, newRow]);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add armour:', err);
      throw err;
    }
  }, [characterId, repo]);

  // ===================================================================
  // CHARACTER AMMO
  // ===================================================================

  const addAmmo = useCallback(async (ammoItem: AmmoRow) => {
    if (!characterId) return;
    
    try {
      const ammoData: Omit<CharacterAmmo, 'id' | 'characterId' | 'createdAt'> = {
        type: ammoItem.Weapon, // In the database, "type" stores weapon/ammo type
        quantity: ammoItem['Total Rounds'] || 0,
        maxQuantity: typeof ammoItem['Magazine Size'] === 'number' ? ammoItem['Magazine Size'] : undefined,
        weaponCompatibility: ammoItem['Ammo Type'],
        notes: ammoItem.Notes,
      };

      const result = await repo.addCharacterAmmo(characterId, ammoData);
      if (result.success && result.data) {
        const newRow = mapAmmoToRow(result.data);
        setAmmo(prev => [...prev, newRow]);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add ammo:', err);
      throw err;
    }
  }, [characterId, repo]);

  const fireRound = useCallback(async (ammoIndex: number) => {
    if (!characterId || ammoIndex < 0 || ammoIndex >= ammo.length) return;

    // Get current ammo item
    const currentAmmo = ammo[ammoIndex];
    const totalRounds = currentAmmo['Total Rounds'] || 0;

    if (totalRounds <= 0) return;

    // Update local state immediately (optimistic update)
    const updatedAmmo = [...ammo];
    updatedAmmo[ammoIndex] = {
      ...currentAmmo,
      'Total Rounds': totalRounds - 1,
    };
    setAmmo(updatedAmmo);

    // TODO: Sync to database
    // Need to track ammo IDs to update specific records
  }, [characterId, ammo]);

  const reloadWeapon = useCallback(async (ammoIndex: number) => {
    if (!characterId || ammoIndex < 0 || ammoIndex >= ammo.length) return;

    // Get current ammo item
    const currentAmmo = ammo[ammoIndex];
    const magazineSize = typeof currentAmmo['Magazine Size'] === 'number' 
      ? currentAmmo['Magazine Size'] 
      : 0;

    // Update local state immediately (optimistic update)
    const updatedAmmo = [...ammo];
    updatedAmmo[ammoIndex] = {
      ...currentAmmo,
      'Rounds Loaded': magazineSize,
    };
    setAmmo(updatedAmmo);

    // TODO: Sync to database
  }, [characterId, ammo]);

  return {
    // State
    finance,
    inventory,
    weapons,
    armour,
    ammo,
    isLoading,
    error,
    
    // Finance operations
    updateFinance,
    addFinance,
    
    // Inventory operations
    addInventory,
    
    // Weapons operations
    addWeapon,
    
    // Armour operations
    addArmour,
    
    // Ammo operations
    addAmmo,
    fireRound,
    reloadWeapon,
  };
}

// ===================================================================
// MAPPING FUNCTIONS: Database entities -> App row format
// ===================================================================

function mapFinanceToRow(finance: CharacterFinance): FinanceRow {
  return {
    Date: finance.transactionDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
    Description: finance.description,
    Category: 'Income', // Default, could be enhanced
    Subcategory: undefined,
    'Amount (Cr)': finance.amount,
    'Paid By': undefined,
    'Paid From (Fund)': undefined,
    'Running Total': undefined,
    Notes: undefined,
  };
}

function mapInventoryToRow(inventory: CharacterInventory): InventoryRow {
  return {
    Item: inventory.itemName,
    Qty: inventory.quantity,
    'Unit Mass (kg)': inventory.weight,
    'Total Mass (kg)': inventory.weight ? inventory.weight * inventory.quantity : undefined,
    'Unit Value (Cr)': inventory.value,
    'Total Value (Cr)': inventory.value ? inventory.value * inventory.quantity : undefined,
    'Location/Container': undefined,
    Notes: inventory.description,
  };
}

function mapWeaponToRow(weapon: CharacterWeapon): WeaponRow {
  return {
    Weapon: weapon.name,
    Type: undefined,
    Damage: weapon.damage,
    Range: weapon.range,
    Mass: weapon.weight,
    Cost: weapon.cost,
    Notes: weapon.notes,
  };
}

function mapArmourToRow(armour: CharacterArmour): ArmourRow {
  return {
    Armour: armour.name,
    Type: undefined,
    Protection: armour.protection,
    Mass: armour.weight,
    Cost: armour.cost,
    Notes: armour.notes,
  };
}

function mapAmmoToRow(ammo: CharacterAmmo): AmmoRow {
  return {
    Weapon: ammo.type,
    'Ammo Type': ammo.weaponCompatibility,
    'Magazine Size': ammo.maxQuantity,
    'Rounds Loaded': undefined, // Not stored in database yet
    'Spare Magazines': undefined,
    'Loose Rounds': undefined,
    'Total Rounds': ammo.quantity,
    Cost: undefined,
    Notes: ammo.notes,
  };
}
