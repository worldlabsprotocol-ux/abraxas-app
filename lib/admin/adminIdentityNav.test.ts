import { describe, expect, it } from "vitest";
import {
  ADMIN_IDENTITY_NAV,
  adminIdentityPendingAriaLabel,
  formatAdminIdentityPendingBadge,
  shouldFetchAdminIdentityPendingCount,
  shouldShowAdminIdentityNav,
} from "@/lib/admin/adminIdentityNav";

describe("admin identity navigation visibility", () => {
  it("shows admin identity navigation only for authorized admins", () => {
    expect(shouldShowAdminIdentityNav(true)).toBe(true);
    expect(shouldShowAdminIdentityNav(false)).toBe(false);
  });

  it("fetches pending count only for authorized admins", () => {
    expect(shouldFetchAdminIdentityPendingCount(true)).toBe(true);
    expect(shouldFetchAdminIdentityPendingCount(false)).toBe(false);
  });

  it("does not expose pending badge data to non-admins", () => {
    expect(formatAdminIdentityPendingBadge(4, false)).toBeNull();
    expect(adminIdentityPendingAriaLabel(4)).toBe("4 pending verification submissions");
  });

  it("formats pending badge only when count is positive", () => {
    expect(formatAdminIdentityPendingBadge(3, true)).toBe("3");
    expect(formatAdminIdentityPendingBadge(0, true)).toBeNull();
    expect(formatAdminIdentityPendingBadge(null, true)).toBeNull();
  });

  it("links identity review to /admin/identity with user-friendly copy", () => {
    expect(ADMIN_IDENTITY_NAV.href).toBe("/admin/identity");
    expect(ADMIN_IDENTITY_NAV.label).toBe("Identity review");
    expect(ADMIN_IDENTITY_NAV.description).toContain("pending verification submissions");
  });
});
