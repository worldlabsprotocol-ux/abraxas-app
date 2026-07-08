import { describe, expect, it } from "vitest";
import type { PartnerAuthContext } from "@/lib/partner/partnerAuth";

// Scope helper mirrored from v1PartnerAuth for unit testing
function scopeAllowed(ctx: PartnerAuthContext, required: "verify:requests" | "verify:credential"): boolean {
  if (ctx.scopes.includes(required)) return true;
  if (required === "verify:requests" && ctx.scopes.includes("verify:credential")) return true;
  return false;
}

describe("v1 partner scopes", () => {
  it("allows verify:requests when verify:credential is present", () => {
    const ctx: PartnerAuthContext = {
      partnerId: "test",
      apiKeyId: "k1",
      displayName: "Test",
      keyPrefix: "abx_test_",
      scopes: ["verify:credential", "verify:registry"],
    };
    expect(scopeAllowed(ctx, "verify:requests")).toBe(true);
  });

  it("denies verify:requests when only registry scope", () => {
    const ctx: PartnerAuthContext = {
      partnerId: "test",
      apiKeyId: "k1",
      displayName: "Test",
      keyPrefix: "abx_test_",
      scopes: ["verify:registry"],
    };
    expect(scopeAllowed(ctx, "verify:requests")).toBe(false);
  });
});
