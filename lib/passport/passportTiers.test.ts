// FILE: lib/passport/passportTiers.test.ts
import { describe, it, expect } from "vitest";
import { resolvePassportTier, tierCapabilities, isIdentityVerified } from "./passportTiers";

describe("passportTiers", () => {
  const tier0 = {
    accountActive: false,
    profileComplete: false,
    walletBound: false,
    walletBindingFresh: false,
    identityCredentialActive: false,
  };

  const tier1 = {
    accountActive: true,
    profileComplete: true,
    walletBound: true,
    walletBindingFresh: true,
    identityCredentialActive: false,
  };

  const tier2 = {
    ...tier1,
    identityCredentialActive: true,
  };

  it("resolves Tier 0 without account", () => {
    expect(resolvePassportTier(tier0)).toBe(0);
  });

  it("resolves Tier 1 with wallet binding but no identity", () => {
    expect(resolvePassportTier(tier1)).toBe(1);
    expect(isIdentityVerified(tier1)).toBe(false);
  });

  it("resolves Tier 2 with active identity credential", () => {
    expect(resolvePassportTier(tier2)).toBe(2);
    expect(isIdentityVerified(tier2)).toBe(true);
  });

  it("unlocks Cielo pilot at Tier 1 without identity", () => {
    const caps = tierCapabilities(tier1);
    const cielo = caps.find(c => c.label.includes("Cielo verified-rate"));
    expect(cielo?.unlocked).toBe(true);
    const identity = caps.find(c => c.label.includes("Enhanced-trust"));
    expect(identity?.unlocked).toBe(false);
  });
});
