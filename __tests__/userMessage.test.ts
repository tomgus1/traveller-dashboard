import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { userMessage } from "../src/shared/utils/userMessage";

describe("userMessage", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("hides database error details behind the fallback", () => {
    const dbError = Object.assign(
      new Error(
        'new row violates row-level security policy for table "characters"'
      ),
      { code: "XX000" }
    );
    expect(userMessage(dbError, "Failed to save")).toBe("Failed to save");
  });

  it("maps permission and duplicate codes to friendly messages", () => {
    expect(userMessage({ code: "42501", message: "policy x" }, "F")).toBe(
      "You don't have permission to do that"
    );
    expect(
      userMessage({ code: "23505", message: 'violates "uniq_x"' }, "F")
    ).toBe("That already exists");
  });

  it("passes Supabase Auth API messages through", () => {
    const authError = new AuthApiError(
      "Invalid login credentials",
      400,
      "invalid_credentials"
    );
    expect(userMessage(authError, "Failed to sign in")).toBe(
      "Invalid login credentials"
    );
  });

  it("does not pass through non-API auth errors", () => {
    const fetchError = new AuthRetryableFetchError("upstream 503 body", 503);
    expect(userMessage(fetchError, "Failed to sign in")).toBe(
      "Failed to sign in"
    );
  });

  it("recognises network failures", () => {
    expect(userMessage(new TypeError("Failed to fetch"), "F")).toBe(
      "Network error - please check your connection"
    );
  });

  it("uses the fallback for non-errors and logs the original", () => {
    expect(userMessage("boom", "Fallback")).toBe("Fallback");
    expect(console.error).toHaveBeenCalledWith("Fallback", "boom");
  });
});
