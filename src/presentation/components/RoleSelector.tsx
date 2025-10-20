import type { CampaignRoles } from "../../core/entities";
import {
  isValidRoleCombination,
  rolesToDisplayString,
} from "../../shared/utils/permissions";

interface RoleSelectorProps {
  roles: CampaignRoles;
  onChange: (roles: CampaignRoles) => void;
  disabled?: boolean;
  showError?: boolean;
}

export default function RoleSelector({
  roles,
  onChange,
  disabled = false,
  showError = true,
}: RoleSelectorProps) {
  const handleRoleChange = (
    roleType: keyof CampaignRoles,
    checked: boolean
  ) => {
    const newRoles = { ...roles, [roleType]: checked };
    onChange(newRoles);
  };

  const isValid = isValidRoleCombination(roles);
  const hasInvalidGmPlayerCombo =
    roles.isGm && roles.isPlayer && !roles.isAdmin;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={roles.isAdmin}
            onChange={(e) => handleRoleChange("isAdmin", e.target.checked)}
            disabled={disabled}
            className="rounded border-gray-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Administrator
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            (Can manage campaign settings and members)
          </span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={roles.isGm}
            onChange={(e) => handleRoleChange("isGm", e.target.checked)}
            disabled={disabled}
            className="rounded border-gray-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Game Master (GM)
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            (Can run game sessions)
          </span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={roles.isPlayer}
            onChange={(e) => handleRoleChange("isPlayer", e.target.checked)}
            disabled={disabled}
            className="rounded border-gray-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Player
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            (Can create and play characters)
          </span>
        </label>
      </div>

      {/* Current role display */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-zinc-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Current roles:{" "}
          <span className="font-medium text-gray-900 dark:text-zinc-50">
            {rolesToDisplayString(roles)}
          </span>
        </p>
      </div>

      {/* Validation errors */}
      {showError && !isValid && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">
            {!roles.isAdmin &&
              !roles.isGm &&
              !roles.isPlayer &&
              "Must select at least one role."}
            {hasInvalidGmPlayerCombo &&
              "Cannot be both GM and Player without Administrator privileges. This prevents conflicts of interest."}
          </p>
        </div>
      )}
    </div>
  );
}
