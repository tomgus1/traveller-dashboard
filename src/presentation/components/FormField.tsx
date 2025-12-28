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
    { label, type = "text", className, required = false, error, id, ...props },
    ref
  ) => {
    const renderInput = () => {
      if (type === "textarea") {
        const textareaProps = props as TextareaFormFieldProps;
        return (
          <textarea
            id={id}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            className={`
              w-full px-4 py-2.5 
              bg-zinc-50/50 dark:bg-zinc-900/50 
              border border-border-color rounded-2xl 
              text-sm transition-all duration-300
              placeholder:text-zinc-400
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
              disabled:opacity-50 disabled:bg-zinc-100
              ${error ? "border-red-500 focus:ring-red-500/20" : ""}
              ${className || ""}
            `}
            required={required}
            {...textareaProps}
          />
        );
      }

      if (type === "select") {
        const { children, ...selectProps } = props as SelectFormFieldProps;
        return (
          <select
            id={id}
            ref={ref as React.Ref<HTMLSelectElement>}
            className={`
              w-full px-4 py-2.5 
              bg-zinc-50/50 dark:bg-zinc-900/50 
              border border-border-color rounded-2xl 
              text-sm transition-all duration-300
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
              disabled:opacity-50 disabled:bg-zinc-100
              ${error ? "border-red-500 focus:ring-red-500/20" : ""}
              ${className || ""}
            `}
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
          id={id}
          ref={ref as React.Ref<HTMLInputElement>}
          type={type}
          step={type === "number" ? "1" : undefined}
          className={`
            w-full px-4 py-2.5 
            bg-zinc-50/50 dark:bg-zinc-900/50 
            border border-border-color rounded-2xl 
            text-sm transition-all duration-300
            placeholder:text-zinc-400
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
            disabled:opacity-50 disabled:bg-zinc-100
            ${error ? "border-red-500 focus:ring-red-500/20" : ""}
            ${className || ""}
          `}
          required={required}
          {...inputProps}
        />
      );
    };

    return (
      <div>
        {label && (
          <label
            htmlFor={id}
            className="block text-xs font-black uppercase tracking-widest text-muted mb-1.5 ml-1"
          >
            {label} {required && "*"}
          </label>
        )}
        {renderInput()}
        {error && (
          <p className="mt-1 text-xs font-bold text-red-500 ml-1 animate-in">
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";

export default FormField;
