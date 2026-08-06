import { describe, expect, it } from "vitest";
import {
  buildVerifiedHeroPublicState,
  formatCredentialExpiration,
  shouldShowVerifiedHero,
  VERIFIED_HERO_HEADLINE,
} from "./verifiedHero";

describe("shouldShowVerifiedHero", () => {
  it("shows hero only for verified users with active credential", () => {
    expect(shouldShowVerifiedHero("verified", true)).toBe(true);
    expect(shouldShowVerifiedHero("verified", false)).toBe(false);
    expect(shouldShowVerifiedHero("under_review", true)).toBe(false);
    expect(shouldShowVerifiedHero("not_started", false)).toBe(false);
  });
});

describe("formatCredentialExpiration", () => {
  it("formats future expiration in human language", () => {
    const label = formatCredentialExpiration("2030-06-15T00:00:00.000Z", new Date("2026-01-01"));
    expect(label).toMatch(/June 15, 2030/);
  });

  it("returns null for missing date", () => {
    expect(formatCredentialExpiration(null)).toBeNull();
    expect(formatCredentialExpiration(undefined)).toBeNull();
  });
});

describe("buildVerifiedHeroPublicState", () => {
  it("exposes only non-PII public fields", () => {
    const state = buildVerifiedHeroPublicState({
      assuranceLevel: "L2",
      expiresAt: "2030-06-15T00:00:00.000Z",
    });
    expect(state.assuranceLabel).toBe("Assurance L2");
    expect(state.statusLabel).toBe("Verified");
    expect(state.expirationLabel).toMatch(/Valid until/);
    expect(JSON.stringify(state)).not.toMatch(/jwt|selfie|document|biometric/i);
  });

  it("uses verified headline constant", () => {
    expect(VERIFIED_HERO_HEADLINE).toBe("You're verified");
  });
});
