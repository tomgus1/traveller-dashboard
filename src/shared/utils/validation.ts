/**
 * Shared validation utilities following DRY principle
 * Centralizes common validation logic to eliminate duplication
 */

/**
 * Validates email format using standard regex pattern
 * @param email Email string to validate
 * @returns True if email format is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates username format and length
 * @param username Username to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateUsername(username: string): {
  isValid: boolean;
  error?: string;
} {
  if (!username?.trim()) {
    return { isValid: false, error: "Username is required" };
  }

  const trimmed = username.trim();

  if (trimmed.length < 3 || trimmed.length > 30) {
    return {
      isValid: false,
      error: "Username must be between 3 and 30 characters",
    };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return {
      isValid: false,
      error:
        "Username can only contain letters, numbers, hyphens, and underscores",
    };
  }

  return { isValid: true };
}

/**
 * Validates password strength requirements
 * @param password Password to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validatePassword(password: string): {
  isValid: boolean;
  error?: string;
} {
  if (!password) {
    return { isValid: false, error: "Password is required" };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      error: "Password must be at least 8 characters long",
    };
  }

  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  if (!hasLowercase || !hasUppercase || !hasNumber || !hasSpecialChar) {
    return {
      isValid: false,
      error:
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    };
  }

  return { isValid: true };
}

/**
 * Validates campaign name
 * @param name Campaign name to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateCampaignName(name: string): {
  isValid: boolean;
  error?: string;
} {
  if (!name?.trim()) {
    return { isValid: false, error: "Campaign name is required" };
  }

  if (name.length > 100) {
    return {
      isValid: false,
      error: "Campaign name must be 100 characters or less",
    };
  }

  return { isValid: true };
}

/**
 * Validates campaign role
 * @param role Role to validate
 * @returns True if role is valid
 */
export function isValidCampaignRole(role: string): boolean {
  return ["admin", "gm", "player"].includes(role);
}
