import { useCallback } from "react";
import type { CampaignState } from "../types";

/**
 * Custom hook for import/export functionality
 * Separates file I/O concerns from UI components
 * Follows Single Responsibility Principle
 * Uses dynamic imports for better bundle splitting
 */
export function useImportExport(
  setState: (state: CampaignState) => void,
  state: CampaignState
) {
  const handleImport = useCallback(
    async (file: File) => {
      try {
        // Dynamic import - only load ExcelJS when actually needed
        const { importXlsx } = await import("../lib/xlsx");
        await importXlsx(file, setState);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
    [setState]
  );

  const handleExport = useCallback(async () => {
    try {
      // Dynamic import - only load ExcelJS when actually needed
      const { exportXlsx } = await import("../lib/xlsx");
      await exportXlsx(state);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }, [state]);

  return {
    handleImport,
    handleExport,
  };
}
