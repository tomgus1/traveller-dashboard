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

const HUD_INPUT_CLASSES = `
  w-full px-4 py-2.5 
  bg-hud-accent 
  border border-border rounded-2xl 
  text-sm font-bold tracking-tight transition-all duration-300
  text-text-main
  placeholder:text-muted placeholder:font-normal
  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-surface-mid
  disabled:opacity-30 disabled:cursor-not-allowed
`;

const FormField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  FormFieldProps
>(
  (
    { label, type = "text", className, required = false, error, id, ...props },
    ref
  ) => {
    const renderInput = () => {
      const errorClasses = error ? "border-red-500/50 focus:ring-red-500/20" : "";

      if (type === "textarea") {
        const textareaProps = props as TextareaFormFieldProps;
        return (
          <textarea
            id={id}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            className={`${HUD_INPUT_CLASSES} ${errorClasses} ${className || ""}`}
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
            className={`${HUD_INPUT_CLASSES} ${errorClasses} ${className || ""}`}
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
          step={type === "number" ? "any" : undefined}
          className={`${HUD_INPUT_CLASSES} ${errorClasses} ${className || ""}`}
          required={required}
          {...inputProps}
        />
      );
    };

    return (
      <div className="space-y-1.5 min-w-0">
        {label && (
          <label
            htmlFor={id}
            className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1"
          >
            {label} {required && <span className="text-primary">*</span>}
          </label>
        )}
        <div className="relative group">
          {renderInput()}
          {/* Internal Glow Effect on Focus */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none border border-primary/0 group-focus-within:border-primary/20 transition-all duration-300 ring-4 ring-primary/0 group-focus-within:ring-primary/5" />
        </div>
        {error && (
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1 animate-pulse">
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";

export default FormField;
