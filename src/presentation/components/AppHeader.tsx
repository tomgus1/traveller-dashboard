import { Upload, Download } from "lucide-react";
import { Button } from "./Button";

interface AppHeaderProps {
  onImport: (file: File) => Promise<{ success: boolean; error?: string }>;
  onExport: () => Promise<{ success: boolean; error?: string }>;
}

export default function AppHeader({ onImport, onExport }: AppHeaderProps) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = await onImport(file);
      if (!result.success) {
        // Reset the input so the same file can be selected again
        e.target.value = "";
      }
    }
  };

  const handleExport = async () => {
    await onExport();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLLabelElement>) => {
    // Handle Enter and Space key for keyboard accessibility
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.currentTarget.click();
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">Traveller Campaign Dashboard</h1>
      <div className="flex gap-2" role="group" aria-label="File operations">
        <label
          className="btn"
          data-testid="import-button"
          onKeyDown={handleKeyDown}
          tabIndex={0}
          aria-label="Import Excel file containing campaign data"
        >
          <input
            type="file"
            accept=".xlsx,.xls"
            className="sr-only"
            onChange={handleFileChange}
            data-testid="file-input"
          />
          <Upload className="w-4 h-4" aria-hidden="true" />
          Import XLSX
        </label>
        <Button
          onClick={handleExport}
          type="button"
          data-testid="export-button"
          aria-label="Export campaign data to Excel file"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Export XLSX
        </Button>
      </div>
    </div>
  );
}
