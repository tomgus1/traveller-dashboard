import type { PasswordValidation } from "../../core/entities";

export const validatePassword = (password: string): PasswordValidation => {
  const errors: string[] = [];
  let strength: "weak" | "medium" | "strong" = "weak";

  // Minimum length
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  // Character requirements
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  if (!hasLowercase) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!hasUppercase) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!hasNumber) {
    errors.push("Password must contain at least one number");
  }
  if (!hasSpecialChar) {
    errors.push("Password must contain at least one special character");
  }

  // Calculate strength
  const criteriaScore = [
    hasLowercase,
    hasUppercase,
    hasNumber,
    hasSpecialChar,
  ].filter(Boolean).length;
  let lengthScore = 0;
  if (password.length >= 12) {
    lengthScore = 2;
  } else if (password.length >= 8) {
    lengthScore = 1;
  }
  const totalScore = criteriaScore + lengthScore;

  if (totalScore >= 5) {
    strength = "strong";
  } else if (totalScore >= 3) {
    strength = "medium";
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
};

export const getPasswordStrengthColor = (
  strength: "weak" | "medium" | "strong"
): string => {
  switch (strength) {
    case "weak":
      return "text-red-600 dark:text-red-400";
    case "medium":
      return "text-yellow-600 dark:text-yellow-400";
    case "strong":
      return "text-green-600 dark:text-green-400";
  }
};

export const getPasswordStrengthText = (
  strength: "weak" | "medium" | "strong"
): string => {
  switch (strength) {
    case "weak":
      return "Weak";
    case "medium":
      return "Medium";
    case "strong":
      return "Strong";
  }
};

export const validateUsername = (
  username: string
): { isValid: boolean; error?: string } => {
  // Username requirements
  if (username.length < 3) {
    return {
      isValid: false,
      error: "Username must be at least 3 characters long",
    };
  }

  if (username.length > 30) {
    return {
      isValid: false,
      error: "Username must be less than 30 characters long",
    };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return {
      isValid: false,
      error:
        "Username can only contain letters, numbers, hyphens, and underscores",
    };
  }

  if (/^[_-]|[_-]$/.test(username)) {
    return {
      isValid: false,
      error: "Username cannot start or end with hyphens or underscores",
    };
  }

  return { isValid: true };
};
