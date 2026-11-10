import {
  canAdministerMembers,
  canInviteRole,
  canManageMembers,
  canUpdateCampaign,
  canDeleteCampaign,
  canAccessCampaign,
  getPermissionError,
} from "../src/shared/utils/permissions";
import type { CampaignRole } from "../src/core/entities";

describe("Permission Utilities", () => {
  describe("canManageMembers", () => {
    it("should allow admin to manage members", () => {
      expect(canManageMembers("admin")).toBe(true);
    });

    it("should allow GM to manage members", () => {
      expect(canManageMembers("gm")).toBe(true);
    });

    it("should not allow player to manage members", () => {
      expect(canManageMembers("player")).toBe(false);
    });
  });

  describe("canInviteRole", () => {
    const roles: CampaignRole[] = ["admin", "gm", "player"];

    it("lets admins invite any role", () => {
      for (const role of roles) {
        expect(canInviteRole("admin", role)).toBe(true);
        expect(
          canInviteRole({ isAdmin: true, isGm: false, isPlayer: false }, role)
        ).toBe(true);
      }
    });

    it("lets GMs invite players only", () => {
      expect(canInviteRole("gm", "player")).toBe(true);
      expect(canInviteRole("gm", "gm")).toBe(false);
      expect(canInviteRole("gm", "admin")).toBe(false);
    });

    it("doesn't let players invite anyone", () => {
      for (const role of roles) {
        expect(canInviteRole("player", role)).toBe(false);
      }
    });
  });

  describe("canAdministerMembers", () => {
    it("is admin only", () => {
      expect(canAdministerMembers("admin")).toBe(true);
      expect(canAdministerMembers("gm")).toBe(false);
      expect(canAdministerMembers("player")).toBe(false);
      expect(
        canAdministerMembers({ isAdmin: false, isGm: true, isPlayer: true })
      ).toBe(false);
    });
  });

  describe("canUpdateCampaign", () => {
    it("should allow admin to update campaign", () => {
      expect(canUpdateCampaign("admin")).toBe(true);
    });

    it("should not allow GM to update campaign", () => {
      expect(canUpdateCampaign("gm")).toBe(false);
    });

    it("should not allow player to update campaign", () => {
      expect(canUpdateCampaign("player")).toBe(false);
    });
  });

  describe("canDeleteCampaign", () => {
    it("should allow admin to delete campaign", () => {
      expect(canDeleteCampaign("admin")).toBe(true);
    });

    it("should not allow GM to delete campaign", () => {
      expect(canDeleteCampaign("gm")).toBe(false);
    });

    it("should not allow player to delete campaign", () => {
      expect(canDeleteCampaign("player")).toBe(false);
    });
  });

  describe("canAccessCampaign", () => {
    it("should allow admin to access campaign", () => {
      expect(canAccessCampaign("admin")).toBe(true);
    });

    it("should allow GM to access campaign", () => {
      expect(canAccessCampaign("gm")).toBe(true);
    });

    it("should allow player to access campaign", () => {
      expect(canAccessCampaign("player")).toBe(true);
    });
  });

  describe("getPermissionError", () => {
    it("should format single role error correctly", () => {
      const error = getPermissionError("update campaigns", ["admin"]);
      expect(error).toBe("Only admins can update campaigns");
    });

    it("should format multiple role error correctly", () => {
      const error = getPermissionError("manage members", ["admin", "gm"]);
      expect(error).toBe("Only admin and gms can manage members");
    });

    it("should format three role error correctly", () => {
      const roles: CampaignRole[] = ["admin", "gm", "player"];
      const error = getPermissionError("access campaign", roles);
      expect(error).toBe("Only admin, gm and players can access campaign");
    });
  });
});
