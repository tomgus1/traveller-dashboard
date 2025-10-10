import '@testing-library/jest-dom';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Upload: () => 'Upload',
  Download: () => 'Download',
  Plus: () => 'Plus',
  Trash2: () => 'Trash2',
  FileSpreadsheet: () => 'FileSpreadsheet',
}));

// Mock dynamic imports for ExcelJS
jest.mock('../lib/xlsx', () => ({
  importXlsx: jest.fn(),
  exportXlsx: jest.fn(),
}));