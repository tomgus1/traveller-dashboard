import { Upload, Download } from "lucide-react";

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

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="flex items-center gap-4" role="group" aria-label="Mission Data Operations">
        <label
          className="btn-hud py-2.5 px-6 !rounded-xl !text-xs cursor-pointer bg-side !text-main hover:bg-hud-accent border border-border transition-all duration-300 shadow-sm"
          data-testid="import-button"
          tabIndex={0}
        >
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
            data-testid="file-input"
          />
          <Upload className="w-4 h-4 text-primary" aria-hidden="true" />
          <span className="font-black uppercase tracking-widest">Import Data</span>
        </label>

        <button
          onClick={handleExport}
          className="btn-hud py-2.5 px-6 !rounded-xl !text-xs bg-primary text-white shadow-lg shadow-primary-glow/20 transition-all duration-300 hover:scale-105 active:scale-95"
          data-testid="export-button"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          <span className="font-black uppercase tracking-widest">Export Data</span>
        </button>
      </div>
    </div>
  );
}
