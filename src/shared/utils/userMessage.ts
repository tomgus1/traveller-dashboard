import { isAuthApiError, isAuthWeakPasswordError } from "@supabase/supabase-js";

const PERMISSION_CODES = new Set(["42501", "PGRST301", "PGRST302"]);

function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String(error.code);
  }
  return "";
}

/**
 * Turns an error into a message that's safe to show users.
 *
 * Database (PostgREST) errors name tables, columns, constraints and policies,
 * so they're never shown as-is: the raw error goes to the console for
 * debugging and the user gets `fallback` or a friendly equivalent. Supabase
 * Auth API errors ("Invalid login credentials", weak password, ...) are
 * written for end users and pass through.
 */
export function userMessage(error: unknown, fallback: string): string {
  // eslint-disable-next-line no-console
  console.error(fallback, error);

  if (isAuthWeakPasswordError(error) || isAuthApiError(error)) {
    return error.message;
  }
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return "Network error - please check your connection";
  }

  const code = errorCode(error);
  if (PERMISSION_CODES.has(code)) {
    return "You don't have permission to do that";
  }
  if (code === "23505") {
    return "That already exists";
  }
  return fallback;
}
