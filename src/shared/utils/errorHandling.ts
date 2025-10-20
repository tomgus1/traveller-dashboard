/**
 * Shared error handling utilities to reduce code duplication
 */

export interface ApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Generic error handler that standardizes error processing
 */
export function handleAsyncError<T>(
  error: unknown,
  fallbackMessage = "An unexpected error occurred"
): ApiResult<T> {
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }

  return { success: false, error: fallbackMessage };
}

/**
 * Wrapper for async operations that standardizes error handling
 */
export async function safeAsyncOperation<T>(
  operation: () => Promise<ApiResult<T>>,
  fallbackMessage?: string
): Promise<ApiResult<T>> {
  try {
    return await operation();
  } catch (error) {
    return handleAsyncError<T>(error, fallbackMessage);
  }
}

/**
 * Higher-order function that wraps repository methods with error handling
 */
export function withErrorHandling<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<ApiResult<TReturn>>,
  fallbackMessage?: string
) {
  return async (...args: TArgs): Promise<ApiResult<TReturn>> => {
    return safeAsyncOperation(() => fn(...args), fallbackMessage);
  };
}

/**
 * Common validation helpers
 */
export const validators = {
  required: (value: unknown, fieldName = "This field"): string | null => {
    if (value === null || value === undefined || value === "") {
      return `${fieldName} is required`;
    }
    return null;
  },

  email: (value: unknown): string | null => {
    if (typeof value !== "string") return "Please enter a valid email";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : "Please enter a valid email";
  },

  minLength: (
    value: unknown,
    minLength: number,
    fieldName = "This field"
  ): string | null => {
    if (typeof value !== "string") return `${fieldName} must be text`;
    return value.length >= minLength
      ? null
      : `${fieldName} must be at least ${minLength} characters`;
  },

  match: (
    value: unknown,
    compareValue: unknown,
    fieldName = "Fields"
  ): string | null => {
    return value === compareValue ? null : `${fieldName} do not match`;
  },
};

/**
 * Standard success/error message formatting
 */
export const messages = {
  success: {
    created: (item: string) => `${item} created successfully`,
    updated: (item: string) => `${item} updated successfully`,
    deleted: (item: string) => `${item} deleted successfully`,
    generic: "Operation completed successfully",
  },

  error: {
    notFound: (item: string) => `${item} not found`,
    unauthorized: "You are not authorized to perform this action",
    validation: "Please check your input and try again",
    network: "Network error - please check your connection",
    generic: "An unexpected error occurred",
    required: (field: string) => `${field} is required`,
  },
};

/**
 * Loading state management helper
 */
export class LoadingManager {
  private loadingStates = new Map<string, boolean>();
  private callbacks = new Set<() => void>();

  setLoading(key: string, loading: boolean) {
    this.loadingStates.set(key, loading);
    this.notifyCallbacks();
  }

  isLoading(key?: string): boolean {
    if (key) {
      return this.loadingStates.get(key) ?? false;
    }

    // Check if any operation is loading
    return Array.from(this.loadingStates.values()).some(Boolean);
  }

  subscribe(callback: () => void) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private notifyCallbacks() {
    this.callbacks.forEach((callback) => callback());
  }

  clear() {
    this.loadingStates.clear();
    this.notifyCallbacks();
  }
}
