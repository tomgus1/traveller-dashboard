// Utility functions for user display names

/**
 * Extracts the first name from a full name
 * Examples:
 *   "John Doe" -> "John"
 *   "John" -> "John"
 *   "" -> undefined
 */
export function getFirstName(
  fullName: string | null | undefined
): string | undefined {
  if (!fullName || !fullName.trim()) return undefined;
  return fullName.trim().split(/\s+/)[0];
}

/**
 * Gets the best display name for a user with priority:
 * 1. First name from display_name
 * 2. Username (with @ prefix)
 * 3. Email (without domain)
 */
export function getUserDisplayName(
  displayName: string | null | undefined,
  username: string | null | undefined,
  email: string
): string {
  // Try first name from display_name
  const firstName = getFirstName(displayName);
  if (firstName) return firstName;

  // Try username with @ prefix
  if (username) return `@${username}`;

  // Fall back to email username (before @)
  return email.split("@")[0];
}

/**
 * Gets secondary info to show below the display name
 * Shows @username if we showed the first name, otherwise shows email
 */
export function getUserSecondaryInfo(
  displayName: string | null | undefined,
  username: string | null | undefined,
  email: string
): string {
  const firstName = getFirstName(displayName);

  // If we showed first name and have username, show @username
  if (firstName && username) return `@${username}`;

  // Otherwise show email
  return email;
}
