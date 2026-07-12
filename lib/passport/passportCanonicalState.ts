// FILE: lib/passport/passportCanonicalState.ts
// Single source of truth for Passport UI summaries — every fact has one home.

import type { IdentityUiState } from "@/lib/passport/identityUiState";

export type VerificationPlainStatus =
  | "not_started"
  | "in_review"
  | "verified"
  | "expired"
  | "needs_action";

export interface WalletBindingSummary {
  id: string;
  chain: string;
  address: string;
  status: string;
  addedAt: string;
}

export interface PartnerShareSummary {
  id: string;
  partnerId: string;
  proofLabel: string;
  sharedAt: string;
  expiresAt: string | null;
  revoked: boolean;
}

export interface PassportCanonicalState {
  verification: {
    status: VerificationPlainStatus;
    label: string;
    issuer: string | null;
    verifiedAt: string | null;
    expiresAt: string | null;
  };
  wallets: {
    bindings: WalletBindingSummary[];
    activeCount: number;
    summary: string;
    hasActiveBinding: boolean;
  };
  access: {
    shares: PartnerShareSummary[];
    activeCount: number;
    summary: string;
  };
}

export function resolveVerificationPlainStatus(input: {
  identityUi: IdentityUiState;
  expiresAt?: string | null;
}): VerificationPlainStatus {
  if (input.identityUi === "verified") {
    if (input.expiresAt && new Date(input.expiresAt) < new Date()) return "expired";
    return "verified";
  }
  if (input.identityUi === "under_review") return "in_review";
  if (input.identityUi === "needs_action") return "needs_action";
  return "not_started";
}

export const VERIFICATION_PLAIN_LABELS: Record<VerificationPlainStatus, string> = {
  not_started: "Ready to verify",
  in_review: "In review",
  verified: "Verified",
  expired: "Expired",
  needs_action: "Needs action",
};

/** Map raw claim types to proof language — never "KYC data". */
export function formatSharedProof(claims: string[], purpose?: string | null): string {
  if (purpose?.includes("eligibility") || purpose?.includes("guest")) {
    return "Eligibility confirmed";
  }
  if (claims.some(c => c.includes("wallet"))) return "Wallet control confirmed";
  if (claims.some(c => c.includes("identity"))) return "Identity verified (outcome only)";
  if (claims.length === 0) return "Policy decision only";
  return "Minimum proof shared";
}

/** Collapse duplicate partner+proof rows for UI (keeps newest receipt). */
export function dedupeShareSummaries<T extends {
  id: string;
  partnerId: string;
  proofLabel: string;
  sharedAt: string;
  revoked: boolean;
}>(shares: T[]): T[] {
  const byKey = new Map<string, T>();
  for (const share of shares) {
    const key = `${share.partnerId}::${share.proofLabel}::${share.revoked ? "revoked" : "active"}`;
    const existing = byKey.get(key);
    if (!existing || Date.parse(share.sharedAt) > Date.parse(existing.sharedAt)) {
      byKey.set(key, share);
    }
  }
  return Array.from(byKey.values()).sort(
    (a, b) => Date.parse(b.sharedAt) - Date.parse(a.sharedAt),
  );
}

export function buildPassportCanonicalState(input: {
  identityUi: IdentityUiState;
  credentialExpiresAt?: string | null;
  credentialIssuedAt?: string | null;
  idvIssuer?: string | null;
  walletBindings?: Array<{
    id: string;
    chain: string;
    wallet_address: string;
    binding_status: string;
    verified_at: string;
  }>;
  shares?: Array<{
    id: string;
    partner_id: string;
    purpose: string | null;
    claims_authorized: string[];
    shared_at: string;
    expires_at: string | null;
    revoked_at: string | null;
  }>;
}): PassportCanonicalState {
  const verificationStatus = resolveVerificationPlainStatus({
    identityUi: input.identityUi,
    expiresAt: input.credentialExpiresAt,
  });

  const bindings = (input.walletBindings ?? []).map(w => ({
    id: w.id,
    chain: w.chain,
    address: w.wallet_address,
    status: w.binding_status,
    addedAt: w.verified_at,
  }));
  const activeWallets = bindings.filter(w => w.status === "active");

  const sharesRaw = (input.shares ?? []).map(s => ({
    id: s.id,
    partnerId: s.partner_id,
    proofLabel: formatSharedProof(s.claims_authorized, s.purpose),
    sharedAt: s.shared_at,
    expiresAt: s.expires_at,
    revoked: Boolean(s.revoked_at),
  }));
  const shares = dedupeShareSummaries(sharesRaw);
  const activeShares = shares.filter(s => !s.revoked);

  return {
    verification: {
      status: verificationStatus,
      label: VERIFICATION_PLAIN_LABELS[verificationStatus],
      issuer: input.idvIssuer ?? (verificationStatus === "verified" ? "Approved provider" : null),
      verifiedAt: input.credentialIssuedAt ?? null,
      expiresAt: input.credentialExpiresAt ?? null,
    },
    wallets: {
      bindings,
      activeCount: activeWallets.length,
      hasActiveBinding: activeWallets.length > 0,
      summary:
        activeWallets.length === 0
          ? "No wallets connected"
          : activeWallets.length === 1
            ? "1 wallet connected"
            : `${activeWallets.length} wallets connected`,
    },
    access: {
      shares,
      activeCount: activeShares.length,
      summary:
        activeShares.length === 0
          ? "No partner access yet"
          : `${activeShares.length} active permission${activeShares.length === 1 ? "" : "s"}`,
    },
  };
}

/** Compact trust line for profile header — links to canonical sections, no tier jargon. */
export function buildTrustStatusLine(state: PassportCanonicalState): string {
  const parts: string[] = [];
  parts.push(state.verification.label);
  parts.push(state.wallets.summary);
  if (state.access.activeCount > 0) parts.push(state.access.summary);
  return parts.join(" · ");
}
