// FILE: lib/progressiveProof/providers.ts
// Sign-in provider registry — Google is default; policies never hardcode a provider.

import type { SignInProviderDef } from "@/lib/progressiveProof/types";

export const SIGN_IN_PROVIDERS: readonly SignInProviderDef[] = [
  {
    id: "google_zklogin",
    label: "Continue with Google",
    isDefault: true,
    neverSatisfiesClaims: [
      "identity_verified",
      "liveness_passed",
      "government_id_verified",
      "residency_country",
      "product_eligibility",
      "self_attested_age_band",
      "wallet_binding_confirmed",
    ],
  },
  {
    id: "legacy_zklogin_recovery",
    label: "Recover older Passport sign-in",
    isDefault: false,
    neverSatisfiesClaims: [
      "identity_verified",
      "liveness_passed",
      "government_id_verified",
      "residency_country",
      "product_eligibility",
      "self_attested_age_band",
      "wallet_binding_confirmed",
    ],
  },
] as const;

export function getDefaultSignInProvider(): SignInProviderDef {
  return SIGN_IN_PROVIDERS.find((p) => p.isDefault) ?? SIGN_IN_PROVIDERS[0];
}

export function signInSatisfiesClaim(claimType: string): boolean {
  return !SIGN_IN_PROVIDERS.some((p) => p.neverSatisfiesClaims.includes(claimType as never));
}
