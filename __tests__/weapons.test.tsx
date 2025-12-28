import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Weapons from "../src/presentation/components/Weapons";
import { useForm } from "../src/presentation/hooks/useForm";
import type { WeaponRow } from "../src/types";

// Mock the useForm hook
jest.mock("../src/presentation/hooks/useForm");
const mockUseForm = useForm as jest.MockedFunction<typeof useForm>;

// Setup the mock implementation
const mockFormHandlers = {
  form: {
    Weapon: "",
    Type: "",
    Damage: "",
    Range: "",
    Mass: "",
    Cost: "",
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

describe("Weapons Component", () => {
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
      Weapon: "Cutlass",
      Type: "Melee",
      Damage: "2d6+2",
      Range: "Melee",
      Mass: 1.2,
      Cost: 100,
      Notes: "Classic sword",
    },
  ];

  const mockOnAdd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders weapon form and table correctly", () => {
    render(<Weapons rows={mockWeapons} onAdd={mockOnAdd} />);

    // Check form fields are present
    expect(
      screen.getByText("Registry")
    ).toBeInTheDocument();
    expect(screen.getByText("Class")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("DMG")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("RNG")
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("WT (kg)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("CR")).toBeInTheDocument();

    // Check submit button
    expect(screen.getByText("Equip")).toBeInTheDocument();

    // Check table headers
    expect(screen.getAllByText(/Weapon/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Type/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Damage/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Range/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Mass/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cost/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Notes/).length).toBeGreaterThan(0);

    // Check table data
    expect(screen.getAllByText("Laser Pistol").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cutlass").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3d6").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2d6+2").length).toBeGreaterThan(0);
  });

  it("includes all weapon type options", () => {
    render(<Weapons rows={[]} onAdd={mockOnAdd} />);

    // Check that Traveller weapon types from database are available
    expect(screen.getAllByText("Slug Pistol").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Slug Rifle").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Energy Pistol").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Energy Rifle").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Heavy Weapon").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Blade").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Grenade").length).toBeGreaterThan(0);
  });

  it("displays empty state when no weapons", () => {
    render(<Weapons rows={[]} onAdd={mockOnAdd} />);

    expect(screen.getByText("No data available in this section.")).toBeInTheDocument();
  });

  it("has proper accessibility attributes", () => {
    render(<Weapons rows={mockWeapons} onAdd={mockOnAdd} />);

    const addButton = screen.getByTestId("add-weapon-button");
    expect(addButton).toHaveAttribute("data-testid", "add-weapon-button");
    expect(addButton).toHaveAttribute(
      "aria-label",
      "Add new weapon entry to character equipment"
    );
  });
});
