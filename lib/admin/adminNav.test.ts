// FILE: lib/admin/adminNav.test.ts

import { describe, expect, it } from "vitest";
import {
  ADMIN_LEGACY_VERIFICATION_CENTER,
  ADMIN_PROTOCOL_NAV_ITEMS,
  adminNavItemIds,
  getAdminProtocolNavItems,
  isAdminNavItemActive,
  resolveActiveAdminNavItem,
} from "./adminNav";

describe("adminNav protocol sidebar", () => {
  it("lists the seven protocol routes in required order with Identity first", () => {
    expect(adminNavItemIds()).toEqual([
      "identity",
      "partners",
      "partner-flow",
      "receipts",
      "trust",
      "privacy",
      "connect",
    ]);
    expect(getAdminProtocolNavItems()[0]?.href).toBe("/admin/identity");
  });

  it("does not include legacy verification center in the protocol sidebar", () => {
    const hrefs = ADMIN_PROTOCOL_NAV_ITEMS.map(item => item.href);
    expect(hrefs).not.toContain("/admin");
    expect(ADMIN_LEGACY_VERIFICATION_CENTER.href).toBe("/admin");
  });

  it("resolves active nav item for protocol routes", () => {
    expect(resolveActiveAdminNavItem("/admin/identity")?.id).toBe("identity");
    expect(resolveActiveAdminNavItem("/admin/partners")?.id).toBe("partners");
    expect(resolveActiveAdminNavItem("/admin/receipts")?.id).toBe("receipts");
    expect(resolveActiveAdminNavItem("/admin/connect")?.id).toBe("connect");
  });

  it("does not treat legacy /admin as an active protocol item", () => {
    expect(resolveActiveAdminNavItem("/admin")).toBeNull();
  });

  it("matches nested paths without treating /admin as a prefix of protocol routes", () => {
    expect(isAdminNavItemActive("/admin/identity", "/admin/identity")).toBe(true);
    expect(isAdminNavItemActive("/admin/identity/extra", "/admin/identity")).toBe(true);
    expect(isAdminNavItemActive("/admin", "/admin")).toBe(true);
    expect(isAdminNavItemActive("/admin/partners", "/admin")).toBe(false);
    expect(isAdminNavItemActive("/admin", "/admin/identity")).toBe(false);
  });
});
