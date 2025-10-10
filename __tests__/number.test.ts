import { fmtCr, todayISO } from "../src/utils/number";

describe("Number Utilities", () => {
  describe("fmtCr", () => {
    it("should format positive numbers correctly", () => {
      expect(fmtCr(1000)).toBe("1,000 Cr");
      expect(fmtCr(1234567)).toBe("1,234,567 Cr");
      expect(fmtCr(42)).toBe("42 Cr");
      expect(fmtCr(0)).toBe("0 Cr");
    });

    it("should format negative numbers correctly", () => {
      expect(fmtCr(-1000)).toBe("-1,000 Cr");
      expect(fmtCr(-1234567)).toBe("-1,234,567 Cr");
      expect(fmtCr(-42)).toBe("-42 Cr");
    });

    it("should handle decimal numbers by rounding", () => {
      expect(fmtCr(1000.7)).toBe("1,001 Cr"); // Rounds to nearest integer
      expect(fmtCr(1000.3)).toBe("1,000 Cr");
      expect(fmtCr(1000.5)).toBe("1,001 Cr");
    });

    it("should handle very large numbers", () => {
      expect(fmtCr(999999999)).toBe("999,999,999 Cr");
      expect(fmtCr(1000000000)).toBe("1,000,000,000 Cr");
    });

    it("should handle very small numbers", () => {
      expect(fmtCr(0.1)).toBe("0 Cr");
      expect(fmtCr(0.9)).toBe("1 Cr");
    });

    it("should handle edge cases", () => {
      expect(fmtCr(Number.MAX_SAFE_INTEGER)).toContain("Cr");
      expect(fmtCr(Number.MIN_SAFE_INTEGER)).toContain("Cr");
    });
  });

  describe("todayISO", () => {
    it("should return today's date in ISO format", () => {
      const result = todayISO();
      const today = new Date().toISOString().slice(0, 10);
      
      expect(result).toBe(today);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should return consistent format", () => {
      const result1 = todayISO();
      const result2 = todayISO();
      
      // Should be same format (might be different date if called at midnight)
      expect(result1).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result2).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should return current date", () => {
      const result = todayISO();
      const now = new Date();
      const expected = now.toISOString().slice(0, 10);
      
      expect(result).toBe(expected);
    });

    it("should be in YYYY-MM-DD format", () => {
      const result = todayISO();
      const parts = result.split("-");
      
      expect(parts).toHaveLength(3);
      expect(parts[0]).toHaveLength(4); // Year
      expect(parts[1]).toHaveLength(2); // Month
      expect(parts[2]).toHaveLength(2); // Day
      
      // Validate ranges
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);
      
      expect(year).toBeGreaterThan(2020);
      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(31);
    });
  });
});