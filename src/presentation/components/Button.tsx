// Consolidated button variants to eliminate repetition
import { type ReactNode, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger" | "ghost";
  size?: "sm" | "md" | "full";
  children: ReactNode;
}

export function Button({
  variant = "default",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const baseClasses = "btn";

  const variantClasses = {
    default: "",
    primary:
      "bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 text-white border-blue-600 transition-all duration-200",
    danger:
      "bg-red-600 hover:bg-red-700 hover:shadow-lg hover:-translate-y-0.5 text-white border-red-600 transition-all duration-200",
    ghost:
      "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:shadow-sm transition-all duration-200",
  };

  const sizeClasses = {
    sm: "px-2 py-1 text-sm",
    md: "",
    full: "w-full justify-center",
  };

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

// Icon button for common icon-only buttons
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  variant?: "default" | "danger";
  "aria-label": string;
}

export function IconButton({
  icon,
  variant = "default",
  className = "",
  ...props
}: IconButtonProps) {
  const variantClasses = {
    default: "btn p-2 hover:scale-110 transition-all duration-200",
    danger:
      "btn p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:scale-110 transition-all duration-200",
  };

  return (
    <button className={`${variantClasses[variant]} ${className}`} {...props}>
      {icon}
    </button>
  );
}
