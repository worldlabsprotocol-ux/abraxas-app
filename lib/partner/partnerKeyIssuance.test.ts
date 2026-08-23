import { describe, expect, it } from "vitest";
import {
  LEGACY_VERIFY_DEFAULT_SCOPES,
  normalizePartnerKeyScopes,
  partnerAllowsProductionKeys,
  resolveIssuanceEnvironment,
} from "@/lib/partner/partnerKeyIssuance";

describe("partnerKeyIssuance", () => {
  it("resolves omitted environment to test", () => {
    expect(resolveIssuanceEnvironment()).toBe("test");
    expect(resolveIssuanceEnvironment(undefined)).toBe("test");
  });

  it("preserves an explicit environment when provided", () => {
    expect(resolveIssuanceEnvironment("live")).toBe("live");
    expect(resolveIssuanceEnvironment("test")).toBe("test");
  });

  it("detects production-capable partners", () => {
    expect(partnerAllowsProductionKeys(["sandbox"])).toBe(false);
    expect(partnerAllowsProductionKeys(["sandbox", "production"])).toBe(true);
  });

  it("returns legacy verify defaults when scopes are omitted", () => {
    expect(normalizePartnerKeyScopes(undefined)).toEqual({
      ok: true,
      scopes: [...LEGACY_VERIFY_DEFAULT_SCOPES],
      usedLegacyDefault: true,
    });
  });

  it("rejects explicit empty scopes", () => {
    expect(normalizePartnerKeyScopes([], { scopesProvided: true })).toEqual({
      ok: false,
      error: "scopes must be a non-empty array when provided",
    });
  });

  it("rejects unknown explicit scopes", () => {
    expect(
      normalizePartnerKeyScopes(["webhooks:read", "not-a-real-scope"], { scopesProvided: true }),
    ).toEqual({
      ok: false,
      error: "Unknown scope: not-a-real-scope",
    });
  });

  it("deduplicates valid explicit scopes", () => {
    expect(
      normalizePartnerKeyScopes(
        ["webhooks:read", "webhooks:read", "verify:credential"],
        { scopesProvided: true },
      ),
    ).toEqual({
      ok: true,
      scopes: ["webhooks:read", "verify:credential"],
      usedLegacyDefault: false,
    });
  });
});
