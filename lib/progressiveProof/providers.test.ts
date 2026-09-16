// FILE: lib/progressiveProof/providers.test.ts

import { describe, expect, it } from "vitest";
import {
  getDefaultSignInProvider,
  signInSatisfiesClaim,
  SIGN_IN_PROVIDERS,
} from "./providers";

describe("sign-in providers", () => {
  it("defaults to Google zkLogin", () => {
    expect(getDefaultSignInProvider().id).toBe("google_zklogin");
    expect(getDefaultSignInProvider().isDefault).toBe(true);
  });

  it("never satisfies age, residency, identity, or wallet claims", () => {
    const blocked = [
      "identity_verified",
      "residency_country",
      "self_attested_age_band",
      "wallet_binding_confirmed",
      "government_id_verified",
      "liveness_passed",
      "product_eligibility",
    ];
    for (const claim of blocked) {
      expect(signInSatisfiesClaim(claim)).toBe(false);
    }
  });

  it("lists Google as initial provider without hardcoding into every policy", () => {
    expect(SIGN_IN_PROVIDERS.map((p) => p.id)).toContain("google_zklogin");
    expect(SIGN_IN_PROVIDERS.every((p) => p.neverSatisfiesClaims.length > 0)).toBe(true);
  });
});
