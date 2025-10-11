import type { ReactNode } from "react";

interface FormFieldProps {
  label?: string;
  type?: "text" | "number" | "date" | "select";
  placeholder?: string;
  value: string | number;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  children?: ReactNode; // For select options
  className?: string;
  required?: boolean;
}

export default function FormField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  children,
  className,
  required = false,
}: FormFieldProps) {
  const defaultClassName = type === "select" ? "select" : "input";
  const elementClassName = className || defaultClassName;

  const commonProps = {
    className: elementClassName,
    placeholder,
    value,
    onChange,
    required,
  };

  if (type === "select") {
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium mb-1">{label}</label>
        )}
        <select {...commonProps}>{children}</select>
      </div>
    );
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-1">{label}</label>
      )}
      <input
        type={type}
        step={type === "number" ? "1" : undefined}
        {...commonProps}
      />
    </div>
  );
}
