import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Ammo from "../src/presentation/components/Ammo";
import { useForm } from "../src/presentation/hooks/useForm";
import type { AmmoRow, WeaponRow } from "../src/types";

// Mock the useForm hook
jest.mock("../src/presentation/hooks/useForm");
const mockUseForm = useForm as jest.MockedFunction<typeof useForm>;

describe("Ammo Tracking Component", () => {
  const mockWeapons: WeaponRow[] = [
    {
      Weapon: "Laser Pistol",
      Type: "Pistol",
      Damage: "3d6",
      Range: "50m",
      Mass: 1.5,
      Cost: 2000,
      Notes: "TL 9",
    },
    {
      Weapon: "Assault Rifle",
      Type: "Rifle",
      Damage: "3d6",
      Range: "500m",
      Mass: 3.2,
      Cost: 1500,
      Notes: "Auto fire capable",
    },
  ];

  const mockAmmo: AmmoRow[] = [
    {
      Weapon: "Assault Rifle",
      "Ammo Type": "5.56mm",
      "Magazine Size": 30,
      "Rounds Loaded": 15,
      "Spare Magazines": 2,
      "Loose Rounds": 25,
      "Total Rounds": 100,
      Notes: "Standard military rounds",
    },
  ];

  const mockOnAdd = jest.fn();
  const mockOnFireRound = jest.fn();
  const mockOnReload = jest.fn();

  const mockFormHandlers = {
    form: {
      Weapon: "",
      "Ammo Type": "",
      "Magazine Size": "",
      "Rounds Loaded": "",
      "Spare Magazines": "",
      "Loose Rounds": "",
      Notes: "",
    },
    updateField: jest.fn(),
    createInputHandler: jest.fn(() => jest.fn()),
    resetForm: jest.fn(),
    updateFields: jest.fn(),
    getFormData: jest.fn(() => ({})),
    setForm: jest.fn(),
  };

  beforeEach(() => {
    mockUseForm.mockReturnValue(mockFormHandlers);
    jest.clearAllMocks();
  });

  it("renders weapon selection dropdown with character weapons", () => {
    render(
      <Ammo
        rows={[]}
        weapons={mockWeapons}
        onAdd={mockOnAdd}
        onFireRound={mockOnFireRound}
        onReload={mockOnReload}
      />
    );

    // Check that weapons are available in dropdown
    expect(screen.getAllByText("Laser Pistol").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Assault Rifle").length).toBeGreaterThan(0);
    expect(screen.getByText("Custom Ordinance Target")).toBeInTheDocument();
  });

  it("displays ammo tracking instructions in tooltip", async () => {
    render(
      <Ammo
        rows={[]}
        weapons={mockWeapons}
        onAdd={mockOnAdd}
        onFireRound={mockOnFireRound}
        onReload={mockOnReload}
      />
    );

    // Check that the heading and info button are present
    expect(screen.getByText("Ballistics")).toBeInTheDocument();
    expect(screen.getByText("Registry")).toBeInTheDocument();

    // Find the info icon (mocked as "Info")
    const infoIcon = screen.getByText("Info");
    expect(infoIcon).toBeInTheDocument();
  });

  it("renders ammunition entries with action buttons", () => {
    render(
      <Ammo
        rows={mockAmmo}
        weapons={mockWeapons}
        onAdd={mockOnAdd}
        onFireRound={mockOnFireRound}
        onReload={mockOnReload}
      />
    );

    // Check ammo data is displayed - using getAllByText or specific roles since names appear in multiple places
    const weapons = screen.getAllByText("Assault Rifle");
    expect(weapons.length).toBeGreaterThan(0);
    expect(screen.getByText("5.56mm")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();

    // Check action buttons are present
    expect(screen.getByText("Fire")).toBeInTheDocument();
    expect(screen.getByText("Reload")).toBeInTheDocument();
  });

  it("calls onFireRound when fire button is clicked", () => {
    render(
      <Ammo
        rows={mockAmmo}
        weapons={mockWeapons}
        onAdd={mockOnAdd}
        onFireRound={mockOnFireRound}
        onReload={mockOnReload}
      />
    );

    const fireButton = screen.getByText("Fire");
    fireEvent.click(fireButton);

    expect(mockOnFireRound).toHaveBeenCalledWith(0);
  });

  it("calls onReload when reload button is clicked", () => {
    render(
      <Ammo
        rows={mockAmmo}
        weapons={mockWeapons}
        onAdd={mockOnAdd}
        onFireRound={mockOnFireRound}
        onReload={mockOnReload}
      />
    );

    const reloadButton = screen.getByText("Reload");
    fireEvent.click(reloadButton);

    expect(mockOnReload).toHaveBeenCalledWith(0);
  });

  it("disables fire button when no ammo available", () => {
    const emptyAmmo: AmmoRow[] = [
      {
        Weapon: "Empty Gun",
        "Ammo Type": "9mm",
        "Magazine Size": 15,
        "Rounds Loaded": 0,
        "Spare Magazines": 0,
        "Loose Rounds": 0,
        "Total Rounds": 0,
        Notes: "Out of ammo",
      },
    ];

    render(
      <Ammo
        rows={emptyAmmo}
        weapons={mockWeapons}
        onAdd={mockOnAdd}
        onFireRound={mockOnFireRound}
        onReload={mockOnReload}
      />
    );

    const fireButton = screen.getByText("Fire");
    expect(fireButton).toBeDisabled();
  });

  it("disables reload button when no spare ammo available", () => {
    const noSpareAmmo: AmmoRow[] = [
      {
        Weapon: "Low Ammo Gun",
        "Ammo Type": "9mm",
        "Magazine Size": 15,
        "Rounds Loaded": 5,
        "Spare Magazines": 0,
        "Loose Rounds": 0,
        "Total Rounds": 5,
        Notes: "No spare ammo",
      },
    ];

    render(
      <Ammo
        rows={noSpareAmmo}
        weapons={mockWeapons}
        onAdd={mockOnAdd}
        onFireRound={mockOnFireRound}
        onReload={mockOnReload}
      />
    );

    const reloadButton = screen.getByText("Reload");
    expect(reloadButton).toBeDisabled();
  });

  it("includes Actions column in table", () => {
    render(
      <Ammo
        rows={mockAmmo}
        weapons={mockWeapons}
        onAdd={mockOnAdd}
        onFireRound={mockOnFireRound}
        onReload={mockOnReload}
      />
    );

    expect(screen.getByText("Actions")).toBeInTheDocument();
  });
});
