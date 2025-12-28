import { useState } from "react";
import { Lock, Mail, User, AlertTriangle, Eye, EyeOff, Monitor, Sun, Moon } from "lucide-react";
import { Modal } from "./Modal";
import FormField from "./FormField";
import { Button } from "./Button";
import { useTheme } from "../../context/ThemeContext";
import {
  validatePassword,
  getPasswordStrengthText,
  getPasswordStrengthColor,
} from "../../shared/utils/password";
import type {
  User as UserType,
  ChangePasswordRequest,
} from "../../core/entities";

interface AccountSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onUpdateProfile: (data: {
    displayName?: string;
    username?: string;
  }) => Promise<void>;
  onChangePassword: (data: ChangePasswordRequest) => Promise<void>;
  onDeleteAccount: () => void;
}

export default function AccountSettings({
  isOpen,
  onClose,
  user,
  onUpdateProfile,
  onChangePassword,
  onDeleteAccount,
}: AccountSettingsProps) {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "display" | "danger">(
    "profile"
  );

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Profile form state
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [username, setUsername] = useState(user.username || "");

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordValidation = validatePassword(newPassword);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      await onUpdateProfile({
        displayName: displayName.trim() || undefined,
        username: username.trim() || undefined,
      });
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to update profile",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    if (!passwordValidation.isValid) {
      setMessage({
        type: "error",
        text: "Please fix the password requirements",
      });
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      setIsLoading(false);
      return;
    }

    try {
      await onChangePassword({
        currentPassword,
        newPassword,
      });
      setMessage({ type: "success", text: "Password changed successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to change password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    if (
      // eslint-disable-next-line no-alert
      window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      onDeleteAccount();
    }
  };

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "password" as const, label: "Password", icon: Lock },
    { id: "display" as const, label: "Display", icon: Monitor },
    { id: "danger" as const, label: "Danger Zone", icon: AlertTriangle },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Account Settings"
      maxWidth="xl"
    >
      <div className="flex h-[32rem]">
        {/* Sidebar */}
        <div className="w-56 border-r border-gray-200 dark:border-zinc-700 pr-6">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:text-text-main hover:bg-hud-accent"
                    }`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 pl-8">
          {message && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${message.type === "success"
                ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                }`}
            >
              {message.text}
            </div>
          )}

          {activeTab === "profile" && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="flex items-center px-3 py-2 bg-hud-accent border border-border rounded-lg">
                  <Mail className="w-4 h-4 text-muted mr-3" />
                  <span className="text-sm text-muted">
                    {user.email}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1 italic">
                  Email cannot be changed
                </p>
              </div>

              <FormField
                label="Display Name"
                type="text"
                value={displayName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDisplayName(e.target.value)
                }
                placeholder="Enter your display name"
              />

              <FormField
                label="Username"
                type="text"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setUsername(e.target.value)
                }
                placeholder="Enter your username"
              />

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          )}

          {activeTab === "password" && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="relative">
                <FormField
                  label="Current Password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCurrentPassword(e.target.value)
                  }
                  placeholder="Enter your current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="relative">
                <FormField
                  label="New Password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewPassword(e.target.value)
                  }
                  placeholder="Enter your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">
                      Password Strength:
                    </span>
                    <span
                      className={`text-sm font-bold uppercase tracking-widest ${getPasswordStrengthColor(passwordValidation.strength)}`}
                    >
                      {getPasswordStrengthText(passwordValidation.strength)}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    {passwordValidation.errors.map((error, index) => (
                      <div
                        key={index}
                        className="flex items-center text-red-600 dark:text-red-400"
                      >
                        <span className="mr-2">✗</span>
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative">
                <FormField
                  label="Confirm New Password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setConfirmPassword(e.target.value)
                  }
                  placeholder="Confirm your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              <Button
                type="submit"
                disabled={
                  isLoading ||
                  !passwordValidation.isValid ||
                  newPassword !== confirmPassword
                }
                className="w-full"
              >
                {isLoading ? "Changing Password..." : "Change Password"}
              </Button>
            </form>
          )}

          {activeTab === "display" && (
            <div className="space-y-6 animate-hud">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4">
                  Tactical Interface
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => setTheme("light")}
                    type="button"
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${theme === 'light' ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary-glow/10' : 'bg-hud-accent border-border hover:border-primary/50'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-primary text-white' : 'bg-side text-muted'}`}>
                        <Sun className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold">Light HUD</p>
                        <p className="text-xs text-muted">Optimized for high-light environments</p>
                      </div>
                    </div>
                    {theme === 'light' && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                  </button>

                  <button
                    onClick={() => setTheme("dark")}
                    type="button"
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${theme === 'dark' ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary-glow/10' : 'bg-hud-accent border-border hover:border-primary/50'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-primary text-white' : 'bg-side text-muted'}`}>
                        <Moon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold">Dark HUD</p>
                        <p className="text-xs text-muted">Stealth mode for low-light sectors</p>
                      </div>
                    </div>
                    {theme === 'dark' && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                  </button>

                  <button
                    onClick={() => setTheme("system")}
                    type="button"
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${theme === 'system' ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary-glow/10' : 'bg-hud-accent border-border hover:border-primary/50'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${theme === 'system' ? 'bg-primary text-white' : 'bg-side text-muted'}`}>
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold">Dynamic Sync</p>
                        <p className="text-xs text-muted">Inherit system-level display parameters</p>
                      </div>
                    </div>
                    {theme === 'system' && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "danger" && (
            <div className="space-y-6">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Delete Account
                    </h3>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                      Once you delete your account, there is no going back.
                      Please be certain.
                    </p>
                    <div className="mt-4">
                      <Button
                        variant="danger"
                        onClick={handleDeleteAccount}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
