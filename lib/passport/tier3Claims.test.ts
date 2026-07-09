import { describe, it, expect } from "vitest";
import { activeTier3Claims, hasTransactionEligibility } from "./tier3Claims";
import { resolvePassportTier, buildPassportTierInput } from "./passportTiers";

describe("tier3Claims", () => {
  it("detects transaction eligibility from screening claim", () => {
    expect(hasTransactionEligibility(["identity_verified", "screening_outcome"])).toBe(true);
    expect(activeTier3Claims(["screening_outcome", "wallet_binding_confirmed"])).toEqual(["screening_outcome"]);
  });

  it("returns false without tier-3 claims", () => {
    expect(hasTransactionEligibility(["identity_verified", "wallet_binding_confirmed"])).toBe(false);
  });
});

describe("passportTiers Tier 3", () => {
  const base = {
    accountActive: true,
    profileComplete: true,
    walletBound: true,
    walletBindingFresh: true,
    identityCredentialActive: true,
  };

  it("resolves Tier 2 with identity only", () => {
    expect(resolvePassportTier(base)).toBe(2);
  });

  it("resolves Tier 3 with screening claim", () => {
    expect(resolvePassportTier({ ...base, activeClaimTypes: ["screening_outcome"] })).toBe(3);
  });

  it("buildPassportTierInput maps trust fields", () => {
    const input = buildPassportTierInput({
      walletRegistered: true,
      walletBindingClaim: true,
      identityCredentialActive: true,
      activeClaimTypes: ["screening_outcome"],
    });
    expect(resolvePassportTier(input)).toBe(3);
  });
});
