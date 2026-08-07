import { describe, expect, it } from "vitest";
import { resolveAdminActorCategory } from "@/lib/admin/adminActorCategory";

describe("admin actor category", () => {
  it("maps email access to non-pii category without email content", () => {
    const category = resolveAdminActorCategory("email");
    expect(category).toBe("admin_authorized_email");
    expect(category).not.toContain("@");
    expect(category).not.toContain("admin_email:");
  });

  it("maps pin access to admin_pin", () => {
    expect(resolveAdminActorCategory("pin_header")).toBe("admin_pin");
    expect(resolveAdminActorCategory("pin_cookie")).toBe("admin_pin");
  });

  it("maps unknown access to admin_unknown", () => {
    expect(resolveAdminActorCategory(null)).toBe("admin_unknown");
  });
});
