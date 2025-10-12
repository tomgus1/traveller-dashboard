import {
  forwardRef,
  type ReactNode,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
} from "react";

interface BaseFormFieldProps {
  label?: string;
  className?: string;
  required?: boolean;
  error?: string;
}

// Enhanced form field for inputs
interface InputFormFieldProps
  extends BaseFormFieldProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "required"> {
  type?: "text" | "number" | "date" | "email" | "password";
}

// Textarea field props
interface TextareaFormFieldProps
  extends BaseFormFieldProps,
    Omit<
      TextareaHTMLAttributes<HTMLTextAreaElement>,
      "className" | "required"
    > {
  type: "textarea";
}

// Select field props
interface SelectFormFieldProps
  extends BaseFormFieldProps,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "required"> {
  type: "select";
  children: ReactNode;
}

type FormFieldProps =
  | InputFormFieldProps
  | TextareaFormFieldProps
  | SelectFormFieldProps;

const FormField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  FormFieldProps
>(
  (
    { label, type = "text", className, required = false, error, ...props },
    ref
  ) => {
    const labelClassName =
      "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";
    const baseInputClassName = `input w-full ${error ? "border-red-500 focus:border-red-500" : ""}`;

    const renderInput = () => {
      if (type === "textarea") {
        const textareaProps = props as TextareaFormFieldProps;
        return (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            className={className || baseInputClassName}
            required={required}
            {...textareaProps}
          />
        );
      }

      if (type === "select") {
        const { children, ...selectProps } = props as SelectFormFieldProps;
        return (
          <select
            ref={ref as React.Ref<HTMLSelectElement>}
            className={className || "select"}
            required={required}
            {...selectProps}
          >
            {children}
          </select>
        );
      }

      // Regular input
      const inputProps = props as InputFormFieldProps;
      return (
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          type={type}
          step={type === "number" ? "1" : undefined}
          className={className || baseInputClassName}
          required={required}
          {...inputProps}
        />
      );
    };

    return (
      <div>
        {label && (
          <label className={labelClassName}>
            {label} {required && "*"}
          </label>
        )}
        {renderInput()}
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";

export default FormField;
