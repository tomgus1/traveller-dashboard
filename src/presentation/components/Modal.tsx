// Consolidated modal component to eliminate repeated overlay code
import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton, Button } from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "md",
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`card w-full ${maxWidthClasses[maxWidth]}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <IconButton
            icon={<X size={20} />}
            onClick={onClose}
            aria-label="Close modal"
          />
        </div>
        {children}
      </div>
    </div>
  );
}

// Specialized modal footer for consistent button layouts
interface ModalFooterProps {
  onCancel?: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger";
  confirmDisabled?: boolean;
  confirmType?: "button" | "submit";
  isLoading?: boolean;
  children?: ReactNode;
}

export function ModalFooter({
  onCancel,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "primary",
  confirmDisabled = false,
  confirmType = "button",
  isLoading = false,
  children,
}: ModalFooterProps) {
  // If children provided, use them instead of default buttons
  if (children) {
    return <div className="flex gap-2 mt-6">{children}</div>;
  }

  return (
    <div className="flex gap-2 mt-6">
      {onCancel && (
        <Button
          onClick={onCancel}
          variant="ghost"
          className="flex-1 justify-center"
          disabled={isLoading}
        >
          {cancelText}
        </Button>
      )}
      {(onConfirm || confirmType === "submit") && (
        <Button
          onClick={confirmType === "submit" ? undefined : onConfirm}
          variant={confirmVariant}
          className="flex-1 justify-center"
          disabled={isLoading || confirmDisabled}
          type={confirmType}
        >
          {confirmText}
        </Button>
      )}
    </div>
  );
}
