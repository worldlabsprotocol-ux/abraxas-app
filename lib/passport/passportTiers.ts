// FILE: lib/passport/passportTiers.ts
// Tier 0–3 passport model — account, wallet-bound, identity-verified, action-specific.

export type PassportTier = 0 | 1 | 2 | 3;

export interface PassportTierInput {
  accountActive: boolean;
  profileComplete: boolean;
  walletBound: boolean;
  walletBindingFresh: boolean;
  identityCredentialActive: boolean;
  consentActive?: boolean;
}

export interface TierCapability {
  label: string;
  unlocked: boolean;
  tierRequired: PassportTier;
}

export const TIER_LABELS: Record<PassportTier, string> = {
  0: "Abraxas Account",
  1: "Wallet-Bound Passport",
  2: "Identity-Verified Passport",
  3: "Transaction-Specific Eligibility",
};

export const TIER_DESCRIPTIONS: Record<PassportTier, string> = {
  0: "Google zkLogin or email/passkey · terms accepted · profile created",
  1: "Wallet connected · signature verified · wallet_binding_confirmed credential",
  2: "Voluntary Veriff or manual review · active identity claims only when issued",
  3: "Sanctions, investor, KYB, or asset-specific checks per partner policy",
};

export function resolvePassportTier(input: PassportTierInput): PassportTier {
  if (!input.accountActive) return 0;
  if (!input.walletBound || !input.walletBindingFresh) return 0;
  if (!input.profileComplete) return 0;
  if (!input.identityCredentialActive) return 1;
  return 2;
}

export function tierCapabilities(input: PassportTierInput): TierCapability[] {
  const tier = resolvePassportTier(input);

  return [
    {
      label: "Browse public registry",
      unlocked: input.accountActive,
      tierRequired: 0,
    },
    {
      label: "Save profile & connect wallet",
      unlocked: input.accountActive,
      tierRequired: 0,
    },
    {
      label: "Cielo verified-rate pilot (account + wallet + consent)",
      unlocked: tier >= 1 && input.walletBindingFresh,
      tierRequired: 1,
    },
    {
      label: "Partner booking flows requiring wallet binding only",
      unlocked: tier >= 1,
      tierRequired: 1,
    },
    {
      label: "Enhanced-trust payments & asset submissions",
      unlocked: tier >= 2,
      tierRequired: 2,
    },
    {
      label: "Investor / KYB / sanctions-gated actions",
      unlocked: false,
      tierRequired: 3,
    },
  ];
}

export function isIdentityVerified(input: Pick<PassportTierInput, "identityCredentialActive">): boolean {
  return input.identityCredentialActive;
}
