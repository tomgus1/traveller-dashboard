import { useState, useCallback } from "react";

/**
 * Generic hook for handling async operations with loading, error states, and data management
 */
export function useAsyncOperation<T, TParams extends unknown[] = []>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (
      operation: (
        ...params: TParams
      ) => Promise<{ success: boolean; data?: T; error?: string }>,
      ...params: TParams
    ) => {
      setLoading(true);
      setError(null);

      try {
        const result = await operation(...params);

        if (result.success && result.data !== undefined) {
          setData(result.data);
          return { success: true, data: result.data };
        }

        const errorMsg = result.error || "Operation failed";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    clearError,
    setData,
  };
}

/**
 * Specialized hook for handling list operations
 */
export function useAsyncList<T, TParams extends unknown[] = []>() {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (
      operation: (
        ...params: TParams
      ) => Promise<{ success: boolean; data?: T[]; error?: string }>,
      ...params: TParams
    ) => {
      setLoading(true);
      setError(null);

      try {
        const result = await operation(...params);

        if (result.success && result.data !== undefined) {
          setItems(result.data);
          return { success: true, data: result.data };
        }

        const errorMsg = result.error || "Operation failed";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const addItem = useCallback((item: T) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const updateItem = useCallback((index: number, item: T) => {
    setItems((prev) =>
      prev.map((existing, i) => (i === index ? item : existing))
    );
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const reset = useCallback(() => {
    setItems([]);
    setError(null);
    setLoading(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    items,
    loading,
    error,
    execute,
    addItem,
    updateItem,
    removeItem,
    reset,
    clearError,
    setItems,
  };
}
