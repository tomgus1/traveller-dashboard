import {
  isValidEmail,
  validateUsername,
  validatePassword,
  validateCampaignName,
  isValidCampaignRole,
} from "../src/shared/utils/validation";

describe("Validation Utilities", () => {
  describe("isValidEmail", () => {
    it("should validate correct email formats", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name+tag@domain.co.uk")).toBe(true);
      expect(isValidEmail("simple@domain.org")).toBe(true);
    });

    it("should reject invalid email formats", () => {
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail("invalid")).toBe(false);
      expect(isValidEmail("@domain.com")).toBe(false);
      expect(isValidEmail("test@")).toBe(false);
      expect(isValidEmail("test@domain")).toBe(false);
      expect(isValidEmail("test.domain.com")).toBe(false);
    });
  });

  describe("validateUsername", () => {
    it("should validate correct usernames", () => {
      expect(validateUsername("user123")).toEqual({ isValid: true });
      expect(validateUsername("test_user")).toEqual({ isValid: true });
      expect(validateUsername("user-name")).toEqual({ isValid: true });
      expect(validateUsername("ABC123")).toEqual({ isValid: true });
    });

    it("should reject usernames that are too short", () => {
      const result = validateUsername("ab");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Username must be between 3 and 30 characters");
    });

    it("should reject usernames that are too long", () => {
      const result = validateUsername("a".repeat(31));
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Username must be between 3 and 30 characters");
    });

    it("should reject usernames with invalid characters", () => {
      const result = validateUsername("user@name");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "Username can only contain letters, numbers, hyphens, and underscores"
      );
    });

    it("should reject empty usernames", () => {
      const result = validateUsername("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Username is required");
    });

    it("should reject whitespace-only usernames", () => {
      const result = validateUsername("   ");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Username is required");
    });
  });

  describe("validatePassword", () => {
    it("should validate strong passwords", () => {
      expect(validatePassword("MyPassword123!")).toEqual({ isValid: true });
      expect(validatePassword("Test@Pass1")).toEqual({ isValid: true });
      expect(validatePassword("SecureP@ss2023")).toEqual({ isValid: true });
    });

    it("should reject passwords that are too short", () => {
      const result = validatePassword("Test1!");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Password must be at least 8 characters long");
    });

    it("should reject passwords without lowercase letters", () => {
      const result = validatePassword("PASSWORD123!");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      );
    });

    it("should reject passwords without uppercase letters", () => {
      const result = validatePassword("password123!");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      );
    });

    it("should reject passwords without numbers", () => {
      const result = validatePassword("Password!");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      );
    });

    it("should reject passwords without special characters", () => {
      const result = validatePassword("Password123");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      );
    });

    it("should reject empty passwords", () => {
      const result = validatePassword("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Password is required");
    });
  });

  describe("validateCampaignName", () => {
    it("should validate correct campaign names", () => {
      expect(validateCampaignName("My Campaign")).toEqual({ isValid: true });
      expect(validateCampaignName("Test")).toEqual({ isValid: true });
      expect(validateCampaignName("Campaign with Numbers 123")).toEqual({
        isValid: true,
      });
    });

    it("should reject empty campaign names", () => {
      const result = validateCampaignName("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Campaign name is required");
    });

    it("should reject whitespace-only campaign names", () => {
      const result = validateCampaignName("   ");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Campaign name is required");
    });

    it("should reject campaign names that are too long", () => {
      const result = validateCampaignName("a".repeat(101));
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Campaign name must be 100 characters or less");
    });
  });

  describe("isValidCampaignRole", () => {
    it("should validate correct campaign roles", () => {
      expect(isValidCampaignRole("admin")).toBe(true);
      expect(isValidCampaignRole("gm")).toBe(true);
      expect(isValidCampaignRole("player")).toBe(true);
    });

    it("should reject invalid campaign roles", () => {
      expect(isValidCampaignRole("owner")).toBe(false);
      expect(isValidCampaignRole("moderator")).toBe(false);
      expect(isValidCampaignRole("")).toBe(false);
      expect(isValidCampaignRole("ADMIN")).toBe(false); // Case sensitive
    });
  });
});
