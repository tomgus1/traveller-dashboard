import { useState } from "react";
import {
  Lock,
  Mail,
  User,
  AlertTriangle,
  Eye,
  EyeOff,
  Monitor,
  Sun,
  Moon,
  type LucideIcon,
} from "lucide-react";
import { Modal } from "./Modal";
import FormField from "./FormField";
import { Button } from "./Button";
import { useTheme, type ThemeMode } from "../../context/theme";
import {
  validatePassword,
  getPasswordStrengthText,
  getPasswordStrengthColor,
} from "../../shared/utils/password";
import type {
  User as UserType,
  ChangePasswordRequest,
} from "../../core/entities";
import { userMessage } from "../../shared/utils/userMessage";

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

const THEME_OPTIONS: {
  mode: ThemeMode;
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    mode: "light",
    icon: Sun,
    title: "Light HUD",
    description: "Optimized for high-light environments",
  },
  {
    mode: "dark",
    icon: Moon,
    title: "Dark HUD",
    description: "Stealth mode for low-light sectors",
  },
  {
    mode: "system",
    icon: Monitor,
    title: "Dynamic Sync",
    description: "Inherit system-level display parameters",
  },
];

function ThemeOption({
  icon: Icon,
  title,
  description,
  selected,
  onSelect,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      type="button"
      className={`flex items-center justify-between p-4 border transition-all ${selected ? "bg-primary/10 border-primary text-primary" : "bg-surface-low border-border hover:border-primary"}`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`p-2 ${selected ? "bg-primary text-white" : "bg-side text-muted"}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-left">
          <p className="font-black text-xs uppercase tracking-widest">
            {title}
          </p>
          <p className="text-[8px] font-bold uppercase tracking-widest text-muted">
            {description}
          </p>
        </div>
      </div>
      {selected && <div className="w-1.5 h-1.5 bg-primary animate-pulse" />}
    </button>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <FormField
        label={label}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        required
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
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
  const [activeTab, setActiveTab] = useState<
    "profile" | "password" | "display" | "danger"
  >("profile");

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
        text: userMessage(error, "Failed to update profile"),
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
        text: userMessage(error, "Failed to change password"),
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
        <div className="w-56 border-r border-border pr-6">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors border-l-2 ${
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary border-primary"
                      : "text-muted hover:text-text-main hover:bg-surface-low border-transparent"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 mr-2" />
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
              className={`mb-4 p-3 text-[10px] font-black uppercase tracking-widest ${
                message.type === "success"
                  ? "bg-primary/5 text-primary border border-primary"
                  : "bg-accent/5 text-accent border border-accent"
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
                <div className="flex items-center px-3 py-2 bg-surface-low border border-border">
                  <Mail className="w-3.5 h-3.5 text-muted mr-3" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
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
              <PasswordInput
                label="Current Password"
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="Enter your current password"
              />

              <PasswordInput
                label="New Password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Enter your new password"
              />

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

              <PasswordInput
                label="Confirm New Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirm your new password"
              />

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
                  {THEME_OPTIONS.map((option) => (
                    <ThemeOption
                      key={option.mode}
                      {...option}
                      selected={theme === option.mode}
                      onSelect={() => setTheme(option.mode)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "danger" && (
            <div className="space-y-6">
              <div className="bg-accent/5 border border-accent p-4">
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
