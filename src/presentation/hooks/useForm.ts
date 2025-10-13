import { useState, useCallback } from "react";

/**
 * Generic form hook that provides form state management and helper functions.
 * Follows DRY principle by eliminating repetitive form handling code.
 *
 * @param initialValues Initial form values
 * @returns Form state, update functions, and utilities
 */
export function useForm<T extends Record<string, string | number>>(
  initialValues: T
) {
  const [form, setForm] = useState<T>(initialValues);

  /**
   * Update a single field in the form
   * Uses useCallback to prevent unnecessary re-renders
   */
  const updateField = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  /**
   * Create an onChange handler for input elements
   * Eliminates repetitive onChange handler code
   */
  const createInputHandler = useCallback(
    <K extends keyof T>(field: K) => {
      return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        updateField(field, e.target.value as T[K]);
      };
    },
    [updateField]
  );

  /**
   * Reset form to initial values
   * Keeps preservable fields (like date) if specified
   */
  const resetForm = useCallback(
    (preserveFields?: (keyof T)[]) => {
      setForm((prev) => {
        const newForm = { ...initialValues };
        if (preserveFields) {
          preserveFields.forEach((field) => {
            newForm[field] = prev[field];
          });
        }
        return newForm;
      });
    },
    [initialValues]
  );

  /**
   * Update multiple fields at once
   */
  const updateFields = useCallback((updates: Partial<T>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Get form values as a plain object
   * Useful for validation or submission
   */
  const getFormData = useCallback(() => ({ ...form }), [form]);

  return {
    form,
    updateField,
    createInputHandler,
    resetForm,
    updateFields,
    getFormData,
    setForm,
  };
}
