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
  w-full px-4 py-2 
  bg-surface-low
  border border-border rounded-[2px]
  text-xs font-black tracking-widest transition-all duration-300
  text-text-main uppercase
  placeholder:text-muted/50 placeholder:font-normal placeholder:lowercase
  focus:outline-none focus:ring-0 focus:border-primary focus:bg-white
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
      const errorClasses = error ? "border-accent focus:border-accent" : "";

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
          <div className="relative">
            <select
              id={id}
              ref={ref as React.Ref<HTMLSelectElement>}
              className={`${HUD_INPUT_CLASSES} appearance-none ${errorClasses} ${className || ""}`}
              required={required}
              {...selectProps}
            >
              {children}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
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
      <div className="space-y-1 min-w-0">
        {label && (
          <label
            htmlFor={id}
            className="block text-[8px] font-black uppercase tracking-[0.3em] text-muted ml-0.5"
          >
            {label} {required && <span className="text-primary">*</span>}
          </label>
        )}
        <div className="relative group">
          {renderInput()}
          {/* Subtle Frame Effect on Focus */}
          <div className="absolute -inset-[1px] rounded-[2px] pointer-events-none border border-primary/0 group-focus-within:border-primary/40 transition-all duration-300" />
        </div>
        {error && (
          <p className="text-[8px] font-black text-accent uppercase tracking-[0.2em] ml-0.5 animate-pulse">
            ERR: {error}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";

export default FormField;
