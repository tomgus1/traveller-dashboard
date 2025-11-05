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
      screen.getByText("Select from Database or Enter Custom")
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Select Type")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Damage (e.g., 3d6)")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Range (e.g., 150m)")
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Mass (kg)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Cost (Cr)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Notes")).toBeInTheDocument();

    // Check submit button
    expect(screen.getByText("Add Weapon")).toBeInTheDocument();

    // Check table headers
    expect(screen.getByText("Weapon")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Damage")).toBeInTheDocument();
    expect(screen.getByText("Range (m)")).toBeInTheDocument();
    expect(screen.getByText("Mass (kg)")).toBeInTheDocument();
    expect(screen.getByText("Cost")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();

    // Check table data
    expect(screen.getByText("Laser Pistol")).toBeInTheDocument();
    expect(screen.getByText("Cutlass")).toBeInTheDocument();
    expect(screen.getByText("3d6")).toBeInTheDocument();
    expect(screen.getByText("2d6+2")).toBeInTheDocument();
  });

  it("includes all weapon type options", () => {
    render(<Weapons rows={[]} onAdd={mockOnAdd} />);

    // Check that Traveller weapon types from database are available
    expect(screen.getByText("Slug Pistol")).toBeInTheDocument();
    expect(screen.getByText("Slug Rifle")).toBeInTheDocument();
    expect(screen.getByText("Energy Pistol")).toBeInTheDocument();
    expect(screen.getByText("Energy Rifle")).toBeInTheDocument();
    expect(screen.getByText("Heavy Weapon")).toBeInTheDocument();
    expect(screen.getByText("Blade")).toBeInTheDocument();
    expect(screen.getByText("Grenade")).toBeInTheDocument();
  });

  it("displays empty state when no weapons", () => {
    render(<Weapons rows={[]} onAdd={mockOnAdd} />);

    expect(screen.getByText("No rows yet.")).toBeInTheDocument();
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
