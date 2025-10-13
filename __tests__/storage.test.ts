import {
  loadState,
  saveState,
  DEFAULT_STATE,
} from "../src/infrastructure/storage/storage";
import type { CampaignState } from "../src/types";

// Mock localStorage with proper Jest mocks
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: jest
    .fn()
    .mockImplementation(
      (key: string): string | null => mockLocalStorage.store[key] || null
    ),
  setItem: jest.fn().mockImplementation((key: string, value: string): void => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: jest.fn().mockImplementation((key: string): void => {
    delete mockLocalStorage.store[key];
  }),
  clear: jest.fn().mockImplementation((): void => {
    mockLocalStorage.store = {};
  }),
  key: jest.fn(),
  length: 0,
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

describe("Storage Utilities", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  describe("DEFAULT_STATE", () => {
    it("should have all required properties", () => {
      expect(DEFAULT_STATE).toHaveProperty("Party_Finances");
      expect(DEFAULT_STATE).toHaveProperty("Ship_Accounts");
      expect(DEFAULT_STATE).toHaveProperty("Ship_Cargo");
      expect(DEFAULT_STATE).toHaveProperty("Ship_Maintenance_Log");
      expect(DEFAULT_STATE).toHaveProperty("Loans_Mortgage");
      expect(DEFAULT_STATE).toHaveProperty("Party_Inventory");
      expect(DEFAULT_STATE).toHaveProperty("Ammo_Tracker");
      expect(DEFAULT_STATE).toHaveProperty("PCs");
    });

    it("should initialize all arrays as empty", () => {
      expect(DEFAULT_STATE.Party_Finances).toEqual([]);
      expect(DEFAULT_STATE.Ship_Accounts).toEqual([]);
      expect(DEFAULT_STATE.Ship_Cargo).toEqual([]);
      expect(DEFAULT_STATE.Ship_Maintenance_Log).toEqual([]);
      expect(DEFAULT_STATE.Loans_Mortgage).toEqual([]);
      expect(DEFAULT_STATE.Party_Inventory).toEqual([]);
      expect(DEFAULT_STATE.Ammo_Tracker).toEqual([]);
    });

    it("should initialize with empty PCs object", () => {
      expect(DEFAULT_STATE.PCs).toEqual({});
    });
  });

  describe("loadState", () => {
    it("should return DEFAULT_STATE when localStorage is empty", () => {
      const result = loadState();
      expect(result).toEqual(DEFAULT_STATE);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
        "traveller-ui-state-v1"
      );
    });

    it("should return DEFAULT_STATE when localStorage has no data", () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = loadState();
      expect(result).toEqual(DEFAULT_STATE);
    });

    it("should parse valid JSON from localStorage", () => {
      const testState: CampaignState = {
        ...DEFAULT_STATE,
        Party_Finances: [
          {
            Date: "2024-01-01",
            Description: "Test transaction",
            Category: "Income",
            "Amount (Cr)": 1000,
          },
        ],
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testState));

      const result = loadState();
      expect(result).toEqual(testState);
    });

    it("should handle corrupt JSON gracefully", () => {
      mockLocalStorage.getItem.mockReturnValue("invalid json{");

      const result = loadState();
      expect(result).toEqual(DEFAULT_STATE);
    });

    it("should preserve existing character data and ensure complete structure", () => {
      const incompleteState = {
        ...DEFAULT_STATE,
        PCs: {
          "character-1": { Finance: [], Inventory: [] }, // Missing properties
          "character-2": {
            Finance: [],
            Inventory: [],
            Weapons: [],
            Armour: [],
          }, // Missing Ammo
        },
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(incompleteState));

      const result = loadState();

      // Should preserve existing characters and ensure complete structure
      expect(result.PCs["character-1"]).toBeDefined();
      expect(result.PCs["character-1"].Finance).toEqual([]);
      expect(result.PCs["character-1"].Inventory).toEqual([]);
      expect(result.PCs["character-1"].Weapons).toEqual([]);
      expect(result.PCs["character-1"].Armour).toEqual([]);
      expect(result.PCs["character-1"].Ammo).toEqual([]);

      expect(result.PCs["character-2"]).toBeDefined();
      expect(result.PCs["character-2"].Finance).toEqual([]);
      expect(result.PCs["character-2"].Inventory).toEqual([]);
      expect(result.PCs["character-2"].Weapons).toEqual([]);
      expect(result.PCs["character-2"].Armour).toEqual([]);
      expect(result.PCs["character-2"].Ammo).toEqual([]);
    });

    it("should initialize missing Ammo arrays for existing PCs", () => {
      const stateWithoutAmmo = {
        ...DEFAULT_STATE,
        PCs: {
          "Andrew – Dr Vax Vanderpool": {
            Finance: [],
            Inventory: [],
            Weapons: [],
            Armour: [],
            // Missing Ammo
          },
          "Nicole – Admiral Rosa Perre": {
            Finance: [],
            Inventory: [],
            Weapons: [],
            Armour: [],
          },
          "Carol – Lt Colonel Zhana": {
            Finance: [],
            Inventory: [],
            Weapons: [],
            Armour: [],
          },
          "Colin – Captain Travis Drevil": {
            Finance: [],
            Inventory: [],
            Weapons: [],
            Armour: [],
          },
        },
      };

      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify(stateWithoutAmmo)
      );

      const result = loadState();

      expect(result.PCs["Andrew – Dr Vax Vanderpool"].Ammo).toEqual([]);
      expect(result.PCs["Nicole – Admiral Rosa Perre"].Ammo).toEqual([]);
      expect(result.PCs["Carol – Lt Colonel Zhana"].Ammo).toEqual([]);
      expect(result.PCs["Colin – Captain Travis Drevil"].Ammo).toEqual([]);
    });

    it("should handle localStorage throwing an error", () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      const result = loadState();
      expect(result).toEqual(DEFAULT_STATE);

      // Restore the original mock implementation
      mockLocalStorage.getItem.mockImplementation(
        (key: string): string | null => mockLocalStorage.store[key] || null
      );
    });
  });

  describe("saveState", () => {
    it("should save state to localStorage", () => {
      const testState: CampaignState = {
        ...DEFAULT_STATE,
        Party_Finances: [
          {
            Date: "2024-01-01",
            Description: "Test transaction",
            Category: "Income",
            "Amount (Cr)": 1000,
          },
        ],
      };

      saveState(testState);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "traveller-ui-state-v1",
        JSON.stringify(testState)
      );
    });

    it("should handle complex state objects", () => {
      const complexState: CampaignState = {
        ...DEFAULT_STATE,
        Party_Finances: [
          {
            Date: "2024-01-01",
            Description: "Income",
            Category: "Income",
            "Amount (Cr)": 1000,
          },
          {
            Date: "2024-01-02",
            Description: "Expense",
            Category: "Expense",
            "Amount (Cr)": 500,
          },
        ],
        Ship_Cargo: [
          {
            "Leg/Route": "Vland → Regina",
            Item: "Electronics",
            Tons: 10,
            "Purchase World": "Vland",
            "Purchase Price (Cr/ton)": 1000,
            "Sale World": "Regina",
            "Sale Price (Cr/ton)": 1500,
          },
        ],
        PCs: {
          "Andrew – Dr Vax Vanderpool": {
            Finance: [
              {
                Date: "2024-01-01",
                Description: "PC Income",
                Category: "Income",
                "Amount (Cr)": 500,
              },
            ],
            Inventory: [
              {
                Item: "Rifle",
                Qty: 1,
                "Unit Mass (kg)": 3,
                "Unit Value (Cr)": 1000,
              },
            ],
            Weapons: [],
            Armour: [],
            Ammo: [],
          },
          "Nicole – Admiral Rosa Perre": {
            Finance: [],
            Inventory: [],
            Weapons: [],
            Armour: [],
            Ammo: [],
          },
          "Carol – Lt Colonel Zhana": {
            Finance: [],
            Inventory: [],
            Weapons: [],
            Armour: [],
            Ammo: [],
          },
          "Colin – Captain Travis Drevil": {
            Finance: [],
            Inventory: [],
            Weapons: [],
            Armour: [],
            Ammo: [],
          },
        },
      };

      saveState(complexState);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "traveller-ui-state-v1",
        JSON.stringify(complexState)
      );

      // Verify we can round-trip the data
      const savedData = mockLocalStorage.store["traveller-ui-state-v1"];
      const parsed = JSON.parse(savedData);
      expect(parsed).toEqual(complexState);
    });

    it("should overwrite existing data", () => {
      const state1: CampaignState = {
        ...DEFAULT_STATE,
        Party_Finances: [
          {
            Date: "2024-01-01",
            Description: "First",
            Category: "Income",
            "Amount (Cr)": 100,
          },
        ],
      };

      const state2: CampaignState = {
        ...DEFAULT_STATE,
        Party_Finances: [
          {
            Date: "2024-01-02",
            Description: "Second",
            Category: "Expense",
            "Amount (Cr)": 200,
          },
        ],
      };

      saveState(state1);
      saveState(state2);

      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2);
      expect(mockLocalStorage.setItem).toHaveBeenLastCalledWith(
        "traveller-ui-state-v1",
        JSON.stringify(state2)
      );
    });
  });

  describe("Integration Tests", () => {
    it("should round-trip save and load correctly", () => {
      const originalState: CampaignState = {
        ...DEFAULT_STATE,
        Party_Finances: [
          {
            Date: "2024-01-01",
            Description: "Test",
            Category: "Income",
            "Amount (Cr)": 1000,
          },
        ],
        PCs: {
          "Andrew – Dr Vax Vanderpool": {
            Finance: [
              {
                Date: "2024-01-01",
                Description: "PC Test",
                Category: "Expense",
                "Amount (Cr)": 100,
              },
            ],
            Inventory: [],
            Weapons: [],
            Armour: [],
            Ammo: [],
          },
          "Nicole – Admiral Rosa Perre": {
            Finance: [],
            Inventory: [],
            Weapons: [],
            Armour: [],
            Ammo: [],
          },
          "Carol – Lt Colonel Zhana": {
            Finance: [],
            Inventory: [],
            Weapons: [],
            Armour: [],
            Ammo: [],
          },
          "Colin – Captain Travis Drevil": {
            Finance: [],
            Inventory: [],
            Weapons: [],
            Armour: [],
            Ammo: [],
          },
          "Tim – Special Agent Ferric Osmund": {
            Finance: [],
            Inventory: [],
            Weapons: [],
            Armour: [],
            Ammo: [],
          },
          "Dom – Dr Bilal ibn Hakim": {
            Finance: [],
            Inventory: [],
            Weapons: [],
            Armour: [],
            Ammo: [],
          },
        },
      };

      // Save then load
      saveState(originalState);
      const loadedState = loadState();

      expect(loadedState).toEqual(originalState);
    });

    it("should preserve data types after round-trip", () => {
      const state: CampaignState = {
        ...DEFAULT_STATE,
        Party_Finances: [
          {
            Date: "2024-01-01",
            Description: "Test",
            Category: "Income",
            "Amount (Cr)": 1000,
            "Running Total": 1000,
          },
        ],
      };

      saveState(state);
      const loaded = loadState();

      expect(typeof loaded.Party_Finances[0]["Amount (Cr)"]).toBe("number");
      expect(typeof loaded.Party_Finances[0]["Running Total"]).toBe("number");
      expect(typeof loaded.Party_Finances[0].Date).toBe("string");
    });
  });
});
