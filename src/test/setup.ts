import "@testing-library/jest-dom";

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Upload: () => "Upload",
  Download: () => "Download",
  Plus: () => "Plus",
  Trash2: () => "Trash2",
  FileSpreadsheet: () => "FileSpreadsheet",
  HelpCircle: () => "HelpCircle",
  Rocket: () => "Rocket",
  ChevronRight: () => "ChevronRight",
  Edit: () => "Edit",
  Edit3: () => "Edit3",
  User: () => "User",
  Users: () => "Users",
  Settings: () => "Settings",
  X: () => "X",
  UserPlus: () => "UserPlus",
  Building2: () => "Building2",
}));

// Mock dynamic imports for ExcelJS
jest.mock("../shared/utils/xlsx", () => ({
  importXlsx: jest.fn(),
  exportXlsx: jest.fn(),
}));
