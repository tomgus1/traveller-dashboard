import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "./Button";
import FormField from "./FormField";
import { validateUsername } from "../../shared/utils/password";
import type { CompleteProfileRequest } from "../../core/entities";

interface ProfileSetupProps {
  onComplete: (
    profile: CompleteProfileRequest
  ) => Promise<{ success: boolean; error?: string }>;
  loading?: boolean;
}

export default function ProfileSetup({
  onComplete,
  loading = false,
}: ProfileSetupProps) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate display name
    if (!displayName.trim()) {
      newErrors.displayName = "Name is required";
    } else if (displayName.trim().length < 2) {
      newErrors.displayName = "Name must be at least 2 characters long";
    } else if (displayName.trim().length > 50) {
      newErrors.displayName = "Name must be less than 50 characters long";
    }

    // Validate username
    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else {
      const usernameValidation = validateUsername(username.trim());
      if (!usernameValidation.isValid) {
        newErrors.username = usernameValidation.error || "Invalid username";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await onComplete({
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
      });

      if (!result.success && result.error) {
        // Handle specific errors (like username taken)
        if (result.error.toLowerCase().includes("username")) {
          setErrors({ username: result.error });
        } else {
          setErrors({ general: result.error });
        }
      }
    } catch {
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid =
    displayName.trim() && username.trim() && Object.keys(errors).length === 0;

  return (
    <div className="min-h-screen bg-main transition-colors duration-500">
      {/* Header */}
      <div className="bg-side border-b border-border px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-black tracking-tighter uppercase text-text-main">
            Complete Your Profile
          </h1>
          <p className="text-sm text-muted font-medium">
            Set up your profile to start using Traveller Dashboard
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-primary/10 border-2 border-primary/40 flex items-center justify-center mb-4">
              <UserPlus className="h-8 w-8 text-primary shadow-[0_0_15px_var(--color-primary-glow)]" />
            </div>
            <h2 className="text-3xl font-black tracking-tighter uppercase text-text-main">
              Welcome to Traveller Dashboard
            </h2>
            <p className="mt-2 text-muted font-medium">
              Let's set up your profile to get started
            </p>
          </div>

          <div className="card-modern shadow-xl">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <FormField
                  label="Your Name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (errors.displayName) {
                      setErrors((prev) => ({ ...prev, displayName: "" }));
                    }
                  }}
                  placeholder="Enter your first name or full name"
                  error={errors.displayName}
                />
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted italic ml-1">
                  This is how other players will see you in campaigns
                </p>
              </div>

              <div>
                <FormField
                  label="Username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors.username) {
                      setErrors((prev) => ({ ...prev, username: "" }));
                    }
                  }}
                  placeholder="Choose a unique username"
                  error={errors.username}
                />
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted italic ml-1">
                  3-30 characters, letters, numbers, hyphens and underscores
                  only
                </p>
              </div>

              {errors.general && (
                <div className="p-3 text-xs font-bold uppercase tracking-widest bg-accent/10 text-accent border border-accent">
                  {errors.general}
                </div>
              )}

              <Button
                type="submit"
                disabled={!isFormValid || submitting || loading}
                variant="primary"
                className="w-full justify-center py-3"
              >
                {submitting || loading ? "Setting up..." : "Complete Profile"}
              </Button>
            </form>
          </div>

          <div className="text-center text-[10px] font-black uppercase tracking-widest text-muted mt-6">
            <p>You can always change these settings later in your profile</p>
          </div>
        </div>
      </div>
    </div>
  );
}
