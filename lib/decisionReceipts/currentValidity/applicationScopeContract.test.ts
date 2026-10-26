import { describe, expect, it } from "vitest";
import { deriveApplicationScopeFromAuthoritativeFacts } from "./applicationScopeContract";

describe("deriveApplicationScopeFromAuthoritativeFacts", () => {
  const appId = "00000000-0000-4000-8000-000000008836";

  it("permits when app active and binding matches", () => {
    const result = deriveApplicationScopeFromAuthoritativeFacts({
      expectedApplicationId: appId,
      receiptPartnerId: "partner-a",
      store_available: true,
      facts: {
        application_row_present: true,
        application_partner_id: "partner-a",
        application_status: "active",
        binding_row_present: true,
        binding_application_id: appId,
        binding_partner_id: "partner-a",
        binding_revoked_at: null,
      },
    });
    expect(result.application_scope_satisfied).toBe(true);
  });

  it("denies cross-tenant application", () => {
    const result = deriveApplicationScopeFromAuthoritativeFacts({
      expectedApplicationId: appId,
      receiptPartnerId: "partner-a",
      store_available: true,
      facts: {
        application_row_present: true,
        application_partner_id: "partner-b",
        application_status: "active",
        binding_row_present: false,
        binding_application_id: null,
        binding_partner_id: null,
        binding_revoked_at: null,
      },
    });
    expect(result.reasons).toContain("application_mismatch");
  });
});
