import { renderHook, waitFor } from '@testing-library/react';
import { useCharacterData } from '../src/presentation/hooks/useCharacterData';
import { getCharacterRepository } from '../src/core/container';

// Mock the container
jest.mock('../src/core/container', () => ({
  getCharacterRepository: jest.fn(),
}));

describe('useCharacterData', () => {
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      getCharacterFinance: jest.fn(),
      getCharacterInventory: jest.fn(),
      getCharacterWeapons: jest.fn(),
      getCharacterArmour: jest.fn(),
      getCharacterAmmo: jest.fn(),
      addCharacterFinance: jest.fn(),
      addCharacterInventory: jest.fn(),
      addCharacterWeapon: jest.fn(),
      addCharacterArmour: jest.fn(),
      addCharacterAmmo: jest.fn(),
      updateCharacterFinance: jest.fn(),
      updateCharacterWeapon: jest.fn(),
      updateCharacterAmmo: jest.fn(),
    };

    (getCharacterRepository as jest.Mock).mockReturnValue(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should load all character data on mount', async () => {
    const characterId = 'char-123';
    
    mockRepository.getCharacterFinance.mockResolvedValue({ success: true, data: [] });
    mockRepository.getCharacterInventory.mockResolvedValue({ success: true, data: [] });
    mockRepository.getCharacterWeapons.mockResolvedValue({ success: true, data: [] });
    mockRepository.getCharacterArmour.mockResolvedValue({ success: true, data: [] });
    mockRepository.getCharacterAmmo.mockResolvedValue({ success: true, data: [] });

    const { result } = renderHook(() => useCharacterData(characterId));

    await waitFor(() => {
      expect(mockRepository.getCharacterFinance).toHaveBeenCalledWith(characterId);
      expect(mockRepository.getCharacterInventory).toHaveBeenCalledWith(characterId);
      expect(mockRepository.getCharacterWeapons).toHaveBeenCalledWith(characterId);
      expect(mockRepository.getCharacterArmour).toHaveBeenCalledWith(characterId);
      expect(mockRepository.getCharacterAmmo).toHaveBeenCalledWith(characterId);
    });

    expect(result.current.finance).toEqual([]);
    expect(result.current.inventory).toEqual([]);
    expect(result.current.weapons).toEqual([]);
    expect(result.current.armour).toEqual([]);
    expect(result.current.ammo).toEqual([]);
  });

  it('should not load data when characterId is undefined', () => {
    renderHook(() => useCharacterData(undefined));
    
    expect(mockRepository.getCharacterFinance).not.toHaveBeenCalled();
    expect(mockRepository.getCharacterInventory).not.toHaveBeenCalled();
  });

  it('should handle errors when loading finance data', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    mockRepository.getCharacterFinance.mockRejectedValue(new Error('Load failed'));
    mockRepository.getCharacterInventory.mockResolvedValue({ success: true, data: [] });
    mockRepository.getCharacterWeapons.mockResolvedValue({ success: true, data: [] });
    mockRepository.getCharacterArmour.mockResolvedValue({ success: true, data: [] });
    mockRepository.getCharacterAmmo.mockResolvedValue({ success: true, data: [] });

    renderHook(() => useCharacterData('char-123'));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load character data:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('should expose callback functions for data operations', () => {
    mockRepository.getCharacterFinance.mockResolvedValue({ success: true, data: [] });
    mockRepository.getCharacterInventory.mockResolvedValue({ success: true, data: [] });
    mockRepository.getCharacterWeapons.mockResolvedValue({ success: true, data: [] });
    mockRepository.getCharacterArmour.mockResolvedValue({ success: true, data: [] });
    mockRepository.getCharacterAmmo.mockResolvedValue({ success: true, data: [] });

    const { result } = renderHook(() => useCharacterData('char-123'));

    expect(typeof result.current.addFinance).toBe('function');
    expect(typeof result.current.updateFinance).toBe('function');
    expect(typeof result.current.addInventory).toBe('function');
    expect(typeof result.current.addWeapon).toBe('function');
    expect(typeof result.current.addArmour).toBe('function');
    expect(typeof result.current.addAmmo).toBe('function');
    expect(typeof result.current.fireRound).toBe('function');
    expect(typeof result.current.reloadWeapon).toBe('function');
  });

  it('should map entity data to row format', async () => {
    const characterId = 'char-123';
    const testDate = new Date('2025-01-01T00:00:00Z');
    
    const mockFinanceEntity = {
      id: 'fin-1',
      characterId,
      transactionDate: testDate,
      description: 'Salary',
      amount: 1000,
      createdAt: testDate,
    };

    mockRepository.getCharacterFinance.mockResolvedValue({ success: true, data: [mockFinanceEntity] });
    mockRepository.getCharacterInventory.mockResolvedValue({ success: true, data: [] });
    mockRepository.getCharacterWeapons.mockResolvedValue({ success: true, data: [] });
    mockRepository.getCharacterArmour.mockResolvedValue({ success: true, data: [] });
    mockRepository.getCharacterAmmo.mockResolvedValue({ success: true, data: [] });

    const { result } = renderHook(() => useCharacterData(characterId));

    await waitFor(() => {
      expect(result.current.finance).toHaveLength(1);
    });

    // Check that entity was mapped to FinanceRow format
    const financeRow = result.current.finance[0];
    expect(financeRow.Date).toBe('2025-01-01');
    expect(financeRow.Description).toBe('Salary');
    expect(financeRow['Amount (Cr)']).toBe(1000);
  });
});
