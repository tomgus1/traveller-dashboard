import { useState, useEffect, useCallback } from 'react';
import { getCampaignDataRepository } from '../../core/container';
import type {
  FinanceRow,
  CargoRow,
  MaintenanceLogRow,
  LoanRow,
  InventoryRow,
  AmmoRow,
} from '../../types';

/**
 * Custom hook for campaign-level data management with database persistence
 * Handles: Party Finances, Ship Finances, Cargo, Maintenance, Loans, Party Inventory, Ammo
 */
export function useCampaignData(campaignId: string | undefined) {
  const [partyFinances, setPartyFinances] = useState<FinanceRow[]>([]);
  const [shipFinances, setShipFinances] = useState<FinanceRow[]>([]);
  const [shipCargo, setShipCargo] = useState<CargoRow[]>([]);
  const [shipMaintenance, setShipMaintenance] = useState<MaintenanceLogRow[]>([]);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [partyInventory, setPartyInventory] = useState<InventoryRow[]>([]);
  const [campaignAmmo, setCampaignAmmo] = useState<AmmoRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const repo = getCampaignDataRepository();

  // Load all campaign data on mount
  useEffect(() => {
    if (!campaignId) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await repo.getAllCampaignData(campaignId);
        
        setPartyFinances(data.finances);
        setShipFinances(data.shipFinances);
        setShipCargo(data.cargo);
        setShipMaintenance(data.maintenance);
        setLoans(data.loans);
        setPartyInventory(data.partyInventory);
        setCampaignAmmo(data.ammo);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load campaign data:', err);
        setError(err instanceof Error ? err : new Error('Failed to load campaign data'));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]); // repo is singleton from container, stable reference

  // ===================================================================
  // PARTY FINANCES
  // ===================================================================

  const updatePartyFinances = useCallback(async (rows: FinanceRow[]) => {
    if (!campaignId) return;
    
    // For now, just update local state
    // TODO: Implement proper sync strategy (optimistic updates, conflict resolution)
    setPartyFinances(rows);
    
    // In a production app, you'd want to:
    // 1. Detect what changed (added, updated, deleted)
    // 2. Send only the changes to the backend
    // 3. Handle conflicts gracefully
  }, [campaignId]);

  const addPartyFinance = useCallback(async (finance: Omit<FinanceRow, 'Running Total'>) => {
    if (!campaignId) return;
    
    try {
      const newFinance = await repo.addCampaignFinance(campaignId, finance);
      setPartyFinances(prev => [newFinance, ...prev]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add party finance:', err);
      throw err;
    }
  }, [campaignId, repo]);

  // ===================================================================
  // SHIP FINANCES
  // ===================================================================

  const updateShipAccounts = useCallback(async (rows: FinanceRow[]) => {
    if (!campaignId) return;
    setShipFinances(rows);
  }, [campaignId]);

  const addShipFinance = useCallback(async (finance: Omit<FinanceRow, 'Running Total'>) => {
    if (!campaignId) return;
    
    try {
      const newFinance = await repo.addShipFinance(campaignId, finance);
      setShipFinances(prev => [newFinance, ...prev]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add ship finance:', err);
      throw err;
    }
  }, [campaignId, repo]);

  // ===================================================================
  // SHIP CARGO
  // ===================================================================

  const addCargoLeg = useCallback(async (cargo: CargoRow) => {
    if (!campaignId) return;
    
    try {
      const newCargo = await repo.addShipCargo(campaignId, cargo);
      setShipCargo(prev => [newCargo, ...prev]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add cargo:', err);
      throw err;
    }
  }, [campaignId, repo]);

  // ===================================================================
  // SHIP MAINTENANCE
  // ===================================================================

  const addShipMaintenance = useCallback(async (maintenance: MaintenanceLogRow) => {
    if (!campaignId) return;
    
    try {
      const newMaintenance = await repo.addShipMaintenance(campaignId, maintenance);
      setShipMaintenance(prev => [newMaintenance, ...prev]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add maintenance:', err);
      throw err;
    }
  }, [campaignId, repo]);

  // ===================================================================
  // LOANS
  // ===================================================================

  const addLoan = useCallback(async (loan: LoanRow) => {
    if (!campaignId) return;
    
    try {
      const newLoan = await repo.addCampaignLoan(campaignId, loan);
      setLoans(prev => [newLoan, ...prev]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add loan:', err);
      throw err;
    }
  }, [campaignId, repo]);

  // ===================================================================
  // PARTY INVENTORY
  // ===================================================================

  const addPartyInventoryItem = useCallback(async (item: InventoryRow) => {
    if (!campaignId) return;
    
    try {
      const newItem = await repo.addPartyInventoryItem(campaignId, item);
      setPartyInventory(prev => [newItem, ...prev]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add party inventory item:', err);
      throw err;
    }
  }, [campaignId, repo]);

  // ===================================================================
  // CAMPAIGN AMMO
  // ===================================================================

  const addCampaignAmmo = useCallback(async (ammo: AmmoRow) => {
    if (!campaignId) return;
    
    try {
      const newAmmo = await repo.addCampaignAmmo(campaignId, ammo);
      setCampaignAmmo(prev => [newAmmo, ...prev]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add campaign ammo:', err);
      throw err;
    }
  }, [campaignId, repo]);

  return {
    // State
    partyFinances,
    shipFinances,
    shipCargo,
    shipMaintenance,
    loans,
    partyInventory,
    campaignAmmo,
    isLoading,
    error,
    
    // Party Finances
    updatePartyFinances,
    addPartyFinance,
    
    // Ship Finances
    updateShipAccounts,
    addShipFinance,
    
    // Ship Operations
    addCargoLeg,
    addShipMaintenance,
    
    // Loans
    addLoan,
    
    // Party Inventory
    addPartyInventoryItem,
    
    // Campaign Ammo
    addCampaignAmmo,
  };
}
