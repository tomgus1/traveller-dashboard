// Consolidated loading components
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  className = "",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div
      className={`animate-spin  border-b-2 border-blue-600 ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <LoadingSpinner size="lg" className="mx-auto" />
      <p className="mt-4 text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
}
