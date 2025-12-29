// Consolidated button variants to eliminate repetition
import { type ReactNode, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "outline" | "danger" | "ghost" | "premium";
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
  const variantClasses = {
    default: "bg-surface-mid text-text-main hover:bg-surface-high border border-border",
    primary: "bg-primary text-white hover:brightness-110 shadow-lg shadow-primary/20",
    secondary: "bg-side text-white hover:bg-primary border border-white/10",
    outline: "border-2 border-primary/20 bg-transparent text-primary hover:bg-primary/5",
    danger: "bg-accent hover:brightness-110 text-white border-none",
    ghost: "bg-transparent hover:bg-hud-accent text-text-muted",
    premium: "btn-mgt",
  };

  const sizeClasses = {
    sm: "px-2 py-1 text-[10px] tracking-widest uppercase",
    md: "px-6 py-2.5",
    full: "w-full justify-center",
  };

  const combinedClasses = `
    inline-flex items-center gap-2 transition-all duration-300
    active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed font-black uppercase tracking-widest text-xs
    ${variant === 'premium' ? '' : 'rounded-[2px]'}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${className}
  `.trim();

  return (
    <button className={combinedClasses} {...props}>
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
