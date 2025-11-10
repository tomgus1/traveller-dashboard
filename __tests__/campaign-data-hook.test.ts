import { renderHook, waitFor } from '@testing-library/react';
import { useCampaignData } from '../src/presentation/hooks/useCampaignData';
import { getCampaignDataRepository } from '../src/core/container';

//Mock the container
jest.mock('../src/core/container', () => ({
  getCampaignDataRepository: jest.fn(),
}));

describe('useCampaignData', () => {
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      getAllCampaignData: jest.fn(),
      addCampaignFinance: jest.fn(),
      updateCampaignFinance: jest.fn(),
      addShipFinance: jest.fn(),
      updateShipFinance: jest.fn(),
      addShipCargo: jest.fn(),
      addShipMaintenance: jest.fn(),
      addCampaignLoan: jest.fn(),
      addPartyInventoryItem: jest.fn(),
      addCampaignAmmo: jest.fn(),
    };

    (getCampaignDataRepository as jest.Mock).mockReturnValue(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should load all campaign data on mount', async () => {
    const campaignId = 'test-campaign-123';
    
    mockRepository.getAllCampaignData.mockResolvedValue({
      finances: [],
      shipFinances: [],
      cargo: [],
      maintenance: [],
      loans: [],
      partyInventory: [],
      ammo: [],
    });

    const { result } = renderHook(() => useCampaignData(campaignId));

    await waitFor(() => {
      expect(mockRepository.getAllCampaignData).toHaveBeenCalledWith(campaignId);
    });

    expect(result.current.partyFinances).toEqual([]);
    expect(result.current.shipFinances).toEqual([]);
    expect(result.current.shipCargo).toEqual([]);
    expect(result.current.shipMaintenance).toEqual([]);
    expect(result.current.loans).toEqual([]);
    expect(result.current.partyInventory).toEqual([]);
    expect(result.current.campaignAmmo).toEqual([]);
  });

  it('should not load data when campaignId is undefined', () => {
    renderHook(() => useCampaignData(undefined));
    
    expect(mockRepository.getAllCampaignData).not.toHaveBeenCalled();
  });

  it('should handle errors when loading data', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockRepository.getAllCampaignData.mockRejectedValue(new Error('Load failed'));

    renderHook(() => useCampaignData('test-campaign'));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load campaign data:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('should expose callback functions for adding data', () => {
    mockRepository.getAllCampaignData.mockResolvedValue({
      finances: [],
      shipFinances: [],
      cargo: [],
      maintenance: [],
      loans: [],
      partyInventory: [],
      ammo: [],
    });

    const { result } = renderHook(() => useCampaignData('test-campaign'));

    expect(typeof result.current.addPartyFinance).toBe('function');
    expect(typeof result.current.addShipFinance).toBe('function');
    expect(typeof result.current.addCargoLeg).toBe('function');
    expect(typeof result.current.addShipMaintenance).toBe('function');
    expect(typeof result.current.addLoan).toBe('function');
    expect(typeof result.current.addPartyInventoryItem).toBe('function');
    expect(typeof result.current.addCampaignAmmo).toBe('function');
  });
});
