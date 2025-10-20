import { useState, useCallback } from "react";

export interface ValidationRule<T> {
  field: keyof T;
  message: string;
  validate: (value: T[keyof T], formData: T) => boolean;
}

export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
}

/**
 * Generic form validation hook with common patterns
 */
export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  validationRules: ValidationRule<T>[] = []
) {
  const [formState, setFormState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isValid: true,
    isSubmitting: false,
  });

  const validateField = useCallback(
    (field: keyof T, value: T[keyof T], allValues: T): string | null => {
      const rule = validationRules.find((r) => r.field === field);
      if (!rule) return null;

      return rule.validate(value, allValues) ? null : rule.message;
    },
    [validationRules]
  );

  const validateForm = useCallback(
    (values: T): Partial<Record<keyof T, string>> => {
      const errors: Partial<Record<keyof T, string>> = {};

      validationRules.forEach((rule) => {
        const error = validateField(rule.field, values[rule.field], values);
        if (error) {
          errors[rule.field] = error;
        }
      });

      return errors;
    },
    [validationRules, validateField]
  );

  const setValue = useCallback(
    (field: keyof T, value: T[keyof T]) => {
      setFormState((prev) => {
        const newValues = { ...prev.values, [field]: value };
        const fieldError = validateField(field, value, newValues);
        const newErrors = { ...prev.errors };

        if (fieldError) {
          newErrors[field] = fieldError;
        } else {
          delete newErrors[field];
        }

        return {
          ...prev,
          values: newValues,
          errors: newErrors,
          isValid: Object.keys(newErrors).length === 0,
        };
      });
    },
    [validateField]
  );

  const setValues = useCallback(
    (values: Partial<T>) => {
      setFormState((prev) => {
        const newValues = { ...prev.values, ...values };
        const errors = validateForm(newValues);

        return {
          ...prev,
          values: newValues,
          errors,
          isValid: Object.keys(errors).length === 0,
        };
      });
    },
    [validateForm]
  );

  const setTouched = useCallback((field: keyof T, touched = true) => {
    setFormState((prev) => ({
      ...prev,
      touched: { ...prev.touched, [field]: touched },
    }));
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string | null) => {
    setFormState((prev) => {
      const newErrors = { ...prev.errors };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }

      return {
        ...prev,
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0,
      };
    });
  }, []);

  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setFormState((prev) => ({ ...prev, isSubmitting }));
  }, []);

  const reset = useCallback(() => {
    setFormState({
      values: initialValues,
      errors: {},
      touched: {},
      isValid: true,
      isSubmitting: false,
    });
  }, [initialValues]);

  const handleSubmit = useCallback(
    async (onSubmit: (values: T) => Promise<void> | void) => {
      const errors = validateForm(formState.values);

      if (Object.keys(errors).length > 0) {
        setFormState((prev) => ({ ...prev, errors, isValid: false }));
        return;
      }

      setSubmitting(true);
      try {
        await onSubmit(formState.values);
      } finally {
        setSubmitting(false);
      }
    },
    [formState.values, validateForm, setSubmitting]
  );

  const getFieldProps = useCallback(
    (field: keyof T) => ({
      value: formState.values[field],
      onChange: (value: T[keyof T]) => setValue(field, value),
      onBlur: () => setTouched(field),
      error: formState.touched[field] ? formState.errors[field] : undefined,
    }),
    [formState, setValue, setTouched]
  );

  return {
    ...formState,
    setValue,
    setValues,
    setTouched,
    setFieldError,
    setSubmitting,
    reset,
    handleSubmit,
    getFieldProps,
  };
}

// Common validation rules
export const required = <T>(
  field: keyof T,
  message = "This field is required"
): ValidationRule<T> => ({
  field,
  message,
  validate: (value) => value !== null && value !== undefined && value !== "",
});

export const minLength = <T>(
  field: keyof T,
  min: number,
  message?: string
): ValidationRule<T> => ({
  field,
  message: message || `Must be at least ${min} characters`,
  validate: (value) => typeof value === "string" && value.length >= min,
});

export const email = <T>(
  field: keyof T,
  message = "Please enter a valid email"
): ValidationRule<T> => ({
  field,
  message,
  validate: (value) => {
    if (typeof value !== "string") return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },
});

export const matchField = <T>(
  field: keyof T,
  matchField: keyof T,
  message = "Fields do not match"
): ValidationRule<T> => ({
  field,
  message,
  validate: (value, formData) => value === formData[matchField],
});
