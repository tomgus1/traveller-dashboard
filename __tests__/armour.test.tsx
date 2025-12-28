import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Armour from "../src/presentation/components/Armour";
import { useForm } from "../src/presentation/hooks/useForm";
import type { ArmourRow } from "../src/types";

// Mock the useForm hook
jest.mock("../src/presentation/hooks/useForm");
const mockUseForm = useForm as jest.MockedFunction<typeof useForm>;

// Setup the mock implementation
const mockFormHandlers = {
  form: {
    Armour: "",
    Type: "",
    Protection: "",
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

describe("Armour Component", () => {
  const mockArmour: ArmourRow[] = [
    {
      Armour: "Combat Armour",
      Type: "Combat Armour",
      Protection: 12,
      Mass: 8,
      Cost: 20000,
      Notes: "TL 11",
    },
    {
      Armour: "Cloth Armour",
      Type: "Cloth",
      Protection: "5",
      Mass: 2,
      Cost: 250,
      Notes: "Flexible protection",
    },
  ];

  const mockOnAdd = jest.fn();

  it("renders armour form and table correctly", () => {
    render(<Armour rows={mockArmour} onAdd={mockOnAdd} />);

    // Check form fields are present
    expect(
      screen.getByText("Registry")
    ).toBeInTheDocument();
    expect(screen.getByText("Class")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("PROT")
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("WT (kg)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("CR")).toBeInTheDocument();

    // Check submit button
    expect(screen.getByText("Assign")).toBeInTheDocument();

    // Check table headers
    expect(screen.getAllByText(/Armour/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Type/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Protection/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Mass/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cost/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Notes/).length).toBeGreaterThan(0);

    // Check table data
    expect(screen.getAllByText(/Combat Armour/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cloth Armour").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/12/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/5/).length).toBeGreaterThan(0);
  });

  it("includes all armour type options", () => {
    render(<Armour rows={[]} onAdd={mockOnAdd} />);

    // Check that Traveller armour types from database are available
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Heavy")).toBeInTheDocument();
    expect(screen.getByText("Vacc Suit")).toBeInTheDocument();
    expect(screen.getByText("Environment")).toBeInTheDocument();
    expect(screen.getAllByText("Shield").length).toBeGreaterThan(0);
    expect(screen.getByText("Accessory")).toBeInTheDocument();
  });

  it("displays empty state when no armour", () => {
    render(<Armour rows={[]} onAdd={mockOnAdd} />);

    expect(screen.getByText("No data available in this section.")).toBeInTheDocument();
  });

  it("handles mixed protection value types (string and number)", () => {
    const mixedProtectionArmour: ArmourRow[] = [
      {
        Armour: "String Protection",
        Type: "Cloth",
        Protection: "3+2",
        Mass: 1,
        Cost: 100,
        Notes: "String value",
      },
      {
        Armour: "Numeric Protection",
        Type: "Mesh",
        Protection: 8,
        Mass: 4,
        Cost: 500,
        Notes: "Numeric value",
      },
    ];

    render(<Armour rows={mixedProtectionArmour} onAdd={mockOnAdd} />);

    expect(screen.getAllByText(/3\+2/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/8/).length).toBeGreaterThan(0);
  });

  it("has proper accessibility attributes", () => {
    render(<Armour rows={mockArmour} onAdd={mockOnAdd} />);

    const addButton = screen.getByTestId("add-armour-button");
    expect(addButton).toHaveAttribute("data-testid", "add-armour-button");
    expect(addButton).toHaveAttribute(
      "aria-label",
      "Add new armour entry to character equipment"
    );
  });

  it("calls onAdd when form is submitted", () => {
    // Mock form with data
    const formWithData = {
      ...mockFormHandlers,
      form: {
        Armour: "Test Armour",
        Type: "Combat Armour",
        Protection: "10",
        Mass: "5",
        Cost: "1000",
        Notes: "Test notes",
      },
    };
    mockUseForm.mockReturnValue(formWithData);

    render(<Armour rows={[]} onAdd={mockOnAdd} />);

    const submitButton = screen.getByTestId("add-armour-button");
    fireEvent.click(submitButton);

    expect(mockOnAdd).toHaveBeenCalledWith({
      Armour: "Test Armour",
      Type: "Combat Armour",
      Protection: 10,
      Mass: 5,
      Cost: 1000,
      Notes: "Test notes",
    });
  });

  it("resets form after successful submission", () => {
    const formWithData = {
      ...mockFormHandlers,
      form: {
        Armour: "Test Armour",
        Type: "Combat Armour",
        Protection: "10",
        Mass: "5",
        Cost: "1000",
        Notes: "Test notes",
      },
    };
    mockUseForm.mockReturnValue(formWithData);

    render(<Armour rows={[]} onAdd={mockOnAdd} />);

    const submitButton = screen.getByTestId("add-armour-button");
    fireEvent.click(submitButton);

    expect(mockFormHandlers.resetForm).toHaveBeenCalled();
  });

  it("handles form validation by not calling onAdd with empty armour name", () => {
    const formWithEmptyName = {
      ...mockFormHandlers,
      form: {
        Armour: "",
        Type: "Combat Armour",
        Protection: "10",
        Mass: "5",
        Cost: "1000",
        Notes: "Test notes",
      },
    };
    mockUseForm.mockReturnValue(formWithEmptyName);

    render(<Armour rows={[]} onAdd={mockOnAdd} />);

    const submitButton = screen.getByTestId("add-armour-button");
    fireEvent.click(submitButton);

    expect(mockOnAdd).not.toHaveBeenCalled();
    expect(mockFormHandlers.resetForm).not.toHaveBeenCalled();
  });

  it("converts numeric strings to numbers for Mass and Cost", () => {
    const formWithData = {
      ...mockFormHandlers,
      form: {
        Armour: "Test Armour",
        Type: "Combat Armour",
        Protection: "10",
        Mass: "5.5",
        Cost: "1500",
        Notes: "Test notes",
      },
    };
    mockUseForm.mockReturnValue(formWithData);

    render(<Armour rows={[]} onAdd={mockOnAdd} />);

    const submitButton = screen.getByTestId("add-armour-button");
    fireEvent.click(submitButton);

    expect(mockOnAdd).toHaveBeenCalledWith({
      Armour: "Test Armour",
      Type: "Combat Armour",
      Protection: 10,
      Mass: 5.5,
      Cost: 1500,
      Notes: "Test notes",
    });
  });

  it("converts Protection to NaN when it contains non-numeric characters", () => {
    const formWithData = {
      ...mockFormHandlers,
      form: {
        Armour: "Test Armour",
        Type: "Combat Armour",
        Protection: "5+DM",
        Mass: "3",
        Cost: "500",
        Notes: "Variable protection",
      },
    };
    mockUseForm.mockReturnValue(formWithData);

    render(<Armour rows={[]} onAdd={mockOnAdd} />);

    const submitButton = screen.getByTestId("add-armour-button");
    fireEvent.click(submitButton);

    expect(mockOnAdd).toHaveBeenCalledWith({
      Armour: "Test Armour",
      Type: "Combat Armour",
      Protection: NaN,
      Mass: 3,
      Cost: 500,
      Notes: "Variable protection",
    });
  });
});
