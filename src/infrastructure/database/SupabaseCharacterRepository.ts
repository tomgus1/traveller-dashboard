import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Character,
  CharacterFinance,
  CharacterInventory,
  CharacterWeapon,
  CharacterArmour,
  CharacterAmmo,
  CreateCharacterRequest,
  UpdateCharacterRequest,
  OperationResult,
} from '../../core/entities';
import type { CharacterRepository } from '../../core/repositories';

/**
 * Supabase implementation of CharacterRepository
 * Handles all character and character data CRUD operations
 */
export class SupabaseCharacterRepository implements CharacterRepository {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  // ===================================================================
  // CHARACTER MANAGEMENT
  // ===================================================================

  async getCharacters(campaignId: string): Promise<OperationResult<Character[]>> {
    try {
      const { data, error } = await this.supabase
        .from('characters')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const characters: Character[] = (data || []).map(row => ({
        id: row.id,
        campaignId: row.campaign_id,
        name: row.name,
        playerName: row.player_name,
        characterName: row.character_name,
        ownerId: row.owner_id,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));

      return { success: true, data: characters };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get characters',
      };
    }
  }

  async getCharacter(characterId: string): Promise<OperationResult<Character>> {
    try {
      const { data, error } = await this.supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      if (error) throw error;

      const character: Character = {
        id: data.id,
        campaignId: data.campaign_id,
        name: data.name,
        playerName: data.player_name,
        characterName: data.character_name,
        ownerId: data.owner_id,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      return { success: true, data: character };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get character',
      };
    }
  }

  async createCharacter(
    userId: string,
    request: CreateCharacterRequest
  ): Promise<OperationResult<Character>> {
    try {
      const { data, error } = await this.supabase
        .from('characters')
        .insert({
          campaign_id: request.campaignId,
          name: request.name,
          player_name: request.playerName,
          character_name: request.characterName,
          owner_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      const character: Character = {
        id: data.id,
        campaignId: data.campaign_id,
        name: data.name,
        playerName: data.player_name,
        characterName: data.character_name,
        ownerId: data.owner_id,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      return { success: true, data: character };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create character',
      };
    }
  }

  async updateCharacter(
    characterId: string,
    request: UpdateCharacterRequest
  ): Promise<OperationResult> {
    try {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (request.name !== undefined) updates.name = request.name;
      if (request.playerName !== undefined) updates.player_name = request.playerName;
      if (request.characterName !== undefined) updates.character_name = request.characterName;

      const { error } = await this.supabase
        .from('characters')
        .update(updates)
        .eq('id', characterId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update character',
      };
    }
  }

  async deleteCharacter(characterId: string): Promise<OperationResult> {
    try {
      const { error } = await this.supabase
        .from('characters')
        .delete()
        .eq('id', characterId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete character',
      };
    }
  }

  // ===================================================================
  // CHARACTER FINANCE
  // ===================================================================

  async getCharacterFinance(
    characterId: string
  ): Promise<OperationResult<CharacterFinance[]>> {
    try {
      const { data, error } = await this.supabase
        .from('character_finance')
        .select('*')
        .eq('character_id', characterId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      const finances: CharacterFinance[] = (data || []).map(row => ({
        id: row.id,
        characterId: row.character_id,
        description: row.description,
        amount: parseFloat(row.amount),
        transactionDate: new Date(row.transaction_date),
        createdAt: new Date(row.created_at),
      }));

      return { success: true, data: finances };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get character finances',
      };
    }
  }

  async addCharacterFinance(
    characterId: string,
    description: string,
    amount: number
  ): Promise<OperationResult<CharacterFinance>> {
    try {
      const { data, error } = await this.supabase
        .from('character_finance')
        .insert({
          character_id: characterId,
          description,
          amount,
        })
        .select()
        .single();

      if (error) throw error;

      const finance: CharacterFinance = {
        id: data.id,
        characterId: data.character_id,
        description: data.description,
        amount: parseFloat(data.amount),
        transactionDate: new Date(data.transaction_date),
        createdAt: new Date(data.created_at),
      };

      return { success: true, data: finance };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add character finance',
      };
    }
  }

  async updateCharacterFinance(
    financeId: string,
    description?: string,
    amount?: number
  ): Promise<OperationResult> {
    try {
      const updates: Record<string, unknown> = {};
      if (description !== undefined) updates.description = description;
      if (amount !== undefined) updates.amount = amount;

      const { error } = await this.supabase
        .from('character_finance')
        .update(updates)
        .eq('id', financeId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update character finance',
      };
    }
  }

  async deleteCharacterFinance(financeId: string): Promise<OperationResult> {
    try {
      const { error } = await this.supabase
        .from('character_finance')
        .delete()
        .eq('id', financeId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete character finance',
      };
    }
  }

  // ===================================================================
  // CHARACTER INVENTORY
  // ===================================================================

  async getCharacterInventory(
    characterId: string
  ): Promise<OperationResult<CharacterInventory[]>> {
    try {
      const { data, error } = await this.supabase
        .from('character_inventory')
        .select('*')
        .eq('character_id', characterId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const inventory: CharacterInventory[] = (data || []).map(row => ({
        id: row.id,
        characterId: row.character_id,
        itemName: row.item_name,
        quantity: row.quantity,
        weight: row.weight ? parseFloat(row.weight) : undefined,
        value: row.value ? parseFloat(row.value) : undefined,
        description: row.description,
        createdAt: new Date(row.created_at),
      }));

      return { success: true, data: inventory };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get character inventory',
      };
    }
  }

  async addCharacterInventory(
    characterId: string,
    item: Omit<CharacterInventory, 'id' | 'characterId' | 'createdAt'>
  ): Promise<OperationResult<CharacterInventory>> {
    try {
      const { data, error } = await this.supabase
        .from('character_inventory')
        .insert({
          character_id: characterId,
          item_name: item.itemName,
          quantity: item.quantity,
          weight: item.weight,
          value: item.value,
          description: item.description,
        })
        .select()
        .single();

      if (error) throw error;

      const inventory: CharacterInventory = {
        id: data.id,
        characterId: data.character_id,
        itemName: data.item_name,
        quantity: data.quantity,
        weight: data.weight ? parseFloat(data.weight) : undefined,
        value: data.value ? parseFloat(data.value) : undefined,
        description: data.description,
        createdAt: new Date(data.created_at),
      };

      return { success: true, data: inventory };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add character inventory',
      };
    }
  }

  async updateCharacterInventory(
    inventoryId: string,
    updates: Partial<Omit<CharacterInventory, 'id' | 'characterId' | 'createdAt'>>
  ): Promise<OperationResult> {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.itemName !== undefined) dbUpdates.item_name = updates.itemName;
      if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
      if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
      if (updates.value !== undefined) dbUpdates.value = updates.value;
      if (updates.description !== undefined) dbUpdates.description = updates.description;

      const { error } = await this.supabase
        .from('character_inventory')
        .update(dbUpdates)
        .eq('id', inventoryId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update character inventory',
      };
    }
  }

  async deleteCharacterInventory(inventoryId: string): Promise<OperationResult> {
    try {
      const { error} = await this.supabase
        .from('character_inventory')
        .delete()
        .eq('id', inventoryId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete character inventory',
      };
    }
  }

  // ===================================================================
  // CHARACTER WEAPONS
  // ===================================================================

  async getCharacterWeapons(
    characterId: string
  ): Promise<OperationResult<CharacterWeapon[]>> {
    try {
      const { data, error } = await this.supabase
        .from('character_weapons')
        .select('*')
        .eq('character_id', characterId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const weapons: CharacterWeapon[] = (data || []).map(row => ({
        id: row.id,
        characterId: row.character_id,
        name: row.name,
        damage: row.damage,
        range: row.range,
        weight: row.weight ? parseFloat(row.weight) : undefined,
        cost: row.cost ? parseFloat(row.cost) : undefined,
        notes: row.notes,
        createdAt: new Date(row.created_at),
      }));

      return { success: true, data: weapons };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get character weapons',
      };
    }
  }

  async addCharacterWeapon(
    characterId: string,
    weapon: Omit<CharacterWeapon, 'id' | 'characterId' | 'createdAt'>
  ): Promise<OperationResult<CharacterWeapon>> {
    try {
      const { data, error } = await this.supabase
        .from('character_weapons')
        .insert({
          character_id: characterId,
          name: weapon.name,
          damage: weapon.damage,
          range: weapon.range,
          weight: weapon.weight,
          cost: weapon.cost,
          notes: weapon.notes,
        })
        .select()
        .single();

      if (error) throw error;

      const newWeapon: CharacterWeapon = {
        id: data.id,
        characterId: data.character_id,
        name: data.name,
        damage: data.damage,
        range: data.range,
        weight: data.weight ? parseFloat(data.weight) : undefined,
        cost: data.cost ? parseFloat(data.cost) : undefined,
        notes: data.notes,
        createdAt: new Date(data.created_at),
      };

      return { success: true, data: newWeapon };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add character weapon',
      };
    }
  }

  async updateCharacterWeapon(
    weaponId: string,
    updates: Partial<Omit<CharacterWeapon, 'id' | 'characterId' | 'createdAt'>>
  ): Promise<OperationResult> {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.damage !== undefined) dbUpdates.damage = updates.damage;
      if (updates.range !== undefined) dbUpdates.range = updates.range;
      if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
      if (updates.cost !== undefined) dbUpdates.cost = updates.cost;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { error } = await this.supabase
        .from('character_weapons')
        .update(dbUpdates)
        .eq('id', weaponId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update character weapon',
      };
    }
  }

  async deleteCharacterWeapon(weaponId: string): Promise<OperationResult> {
    try {
      const { error } = await this.supabase
        .from('character_weapons')
        .delete()
        .eq('id', weaponId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete character weapon',
      };
    }
  }

  // ===================================================================
  // CHARACTER ARMOUR
  // ===================================================================

  async getCharacterArmour(
    characterId: string
  ): Promise<OperationResult<CharacterArmour[]>> {
    try {
      const { data, error } = await this.supabase
        .from('character_armour')
        .select('*')
        .eq('character_id', characterId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const armour: CharacterArmour[] = (data || []).map(row => ({
        id: row.id,
        characterId: row.character_id,
        name: row.name,
        protection: row.protection,
        weight: row.weight ? parseFloat(row.weight) : undefined,
        cost: row.cost ? parseFloat(row.cost) : undefined,
        notes: row.notes,
        createdAt: new Date(row.created_at),
      }));

      return { success: true, data: armour };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get character armour',
      };
    }
  }

  async addCharacterArmour(
    characterId: string,
    armour: Omit<CharacterArmour, 'id' | 'characterId' | 'createdAt'>
  ): Promise<OperationResult<CharacterArmour>> {
    try {
      const { data, error } = await this.supabase
        .from('character_armour')
        .insert({
          character_id: characterId,
          name: armour.name,
          protection: armour.protection,
          weight: armour.weight,
          cost: armour.cost,
          notes: armour.notes,
        })
        .select()
        .single();

      if (error) throw error;

      const newArmour: CharacterArmour = {
        id: data.id,
        characterId: data.character_id,
        name: data.name,
        protection: data.protection,
        weight: data.weight ? parseFloat(data.weight) : undefined,
        cost: data.cost ? parseFloat(data.cost) : undefined,
        notes: data.notes,
        createdAt: new Date(data.created_at),
      };

      return { success: true, data: newArmour };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add character armour',
      };
    }
  }

  async updateCharacterArmour(
    armourId: string,
    updates: Partial<Omit<CharacterArmour, 'id' | 'characterId' | 'createdAt'>>
  ): Promise<OperationResult> {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.protection !== undefined) dbUpdates.protection = updates.protection;
      if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
      if (updates.cost !== undefined) dbUpdates.cost = updates.cost;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { error } = await this.supabase
        .from('character_armour')
        .update(dbUpdates)
        .eq('id', armourId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update character armour',
      };
    }
  }

  async deleteCharacterArmour(armourId: string): Promise<OperationResult> {
    try {
      const { error } = await this.supabase
        .from('character_armour')
        .delete()
        .eq('id', armourId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete character armour',
      };
    }
  }

  // ===================================================================
  // CHARACTER AMMO
  // ===================================================================

  async getCharacterAmmo(
    characterId: string
  ): Promise<OperationResult<CharacterAmmo[]>> {
    try {
      const { data, error } = await this.supabase
        .from('character_ammo')
        .select('*')
        .eq('character_id', characterId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ammo: CharacterAmmo[] = (data || []).map(row => ({
        id: row.id,
        characterId: row.character_id,
        type: row.type,
        quantity: row.quantity,
        maxQuantity: row.max_quantity,
        weaponCompatibility: row.weapon_compatibility,
        notes: row.notes,
        createdAt: new Date(row.created_at),
      }));

      return { success: true, data: ammo };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get character ammo',
      };
    }
  }

  async addCharacterAmmo(
    characterId: string,
    ammo: Omit<CharacterAmmo, 'id' | 'characterId' | 'createdAt'>
  ): Promise<OperationResult<CharacterAmmo>> {
    try {
      const { data, error } = await this.supabase
        .from('character_ammo')
        .insert({
          character_id: characterId,
          type: ammo.type,
          quantity: ammo.quantity,
          max_quantity: ammo.maxQuantity,
          weapon_compatibility: ammo.weaponCompatibility,
          notes: ammo.notes,
        })
        .select()
        .single();

      if (error) throw error;

      const newAmmo: CharacterAmmo = {
        id: data.id,
        characterId: data.character_id,
        type: data.type,
        quantity: data.quantity,
        maxQuantity: data.max_quantity,
        weaponCompatibility: data.weapon_compatibility,
        notes: data.notes,
        createdAt: new Date(data.created_at),
      };

      return { success: true, data: newAmmo };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add character ammo',
      };
    }
  }

  async updateCharacterAmmo(
    ammoId: string,
    updates: Partial<Omit<CharacterAmmo, 'id' | 'characterId' | 'createdAt'>>
  ): Promise<OperationResult> {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
      if (updates.maxQuantity !== undefined) dbUpdates.max_quantity = updates.maxQuantity;
      if (updates.weaponCompatibility !== undefined) dbUpdates.weapon_compatibility = updates.weaponCompatibility;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { error } = await this.supabase
        .from('character_ammo')
        .update(dbUpdates)
        .eq('id', ammoId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update character ammo',
      };
    }
  }

  async deleteCharacterAmmo(ammoId: string): Promise<OperationResult> {
    try {
      const { error } = await this.supabase
        .from('character_ammo')
        .delete()
        .eq('id', ammoId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete character ammo',
      };
    }
  }
}
