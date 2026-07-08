// FILE: lib/passport/passportTiers.ts
// Tier 0–3 passport model — account, wallet-bound, identity-verified, action-specific.

import { hasTransactionEligibility } from "@/lib/passport/tier3Claims";
import { productionTier3ClaimTypes } from "@/lib/credentials/sandboxClaims";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";

export type PassportTier = 0 | 1 | 2 | 3;

export interface PassportTierInput {
  accountActive: boolean;
  profileComplete: boolean;
  walletBound: boolean;
  walletBindingFresh: boolean;
  identityCredentialActive: boolean;
  consentActive?: boolean;
  /** Active credential claim types from claims registry */
  activeClaimTypes?: string[];
  /** Full active claims — used to exclude sandbox/demo from production Tier 3 */
  activeClaims?: CredentialClaimRecord[];
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
  if (input.activeClaims?.length) {
    if (productionTier3ClaimTypes(input.activeClaims).length > 0) return 3;
  } else if (hasTransactionEligibility(input.activeClaimTypes ?? [])) {
    return 3;
  }
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
      unlocked: tier >= 3,
      tierRequired: 3,
    },
    {
      label: "Partner sandbox eligibility (demo only)",
      unlocked: tier >= 3,
      tierRequired: 3,
    },
  ];
}

export function buildPassportTierInput(input: {
  walletRegistered: boolean;
  walletBindingClaim: boolean;
  identityCredentialActive: boolean;
  activeClaimTypes?: string[];
}): PassportTierInput {
  const walletReady = input.walletRegistered && input.walletBindingClaim;
  return {
    accountActive: input.walletRegistered,
    profileComplete: walletReady,
    walletBound: walletReady,
    walletBindingFresh: input.walletBindingClaim,
    identityCredentialActive: input.identityCredentialActive,
    activeClaimTypes: input.activeClaimTypes ?? [],
  };
}

export function isIdentityVerified(input: Pick<PassportTierInput, "identityCredentialActive">): boolean {
  return input.identityCredentialActive;
}
