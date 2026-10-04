// FILE: lib/walletControl/claim.ts
// Normalized wallet-control claim construction for holder-scoped evidence.

import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { CLAIM_ISSUERS } from "@/lib/credentials/claimSchema";
import {
  WALLET_CONTROL_CLAIM_TYPE,
  WALLET_CONTROL_FRESHNESS_HOURS,
  walletControlEvidenceRef,
} from "@/lib/walletControl/contract";

export interface WalletControlClaimInput {
  subjectId: string;
  walletBindingId: string;
  walletAddress: string;
  chain: string;
  chainId?: number | null;
  network?: string | null;
  controlMethod: string;
  assuranceLevel?: CredentialClaimRecord["assurance_level"];
  verifiedAt?: string;
}

export function computeWalletControlExpiresAt(fromIso: string): string {
  const ms = new Date(fromIso).getTime() + WALLET_CONTROL_FRESHNESS_HOURS * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}

export function buildWalletControlClaim(
  input: WalletControlClaimInput,
): Omit<CredentialClaimRecord, "id" | "status"> {
  const verifiedAt = input.verifiedAt ?? new Date().toISOString();
  return {
    subject_id: input.subjectId,
    credential_jti: null,
    claim_type: WALLET_CONTROL_CLAIM_TYPE,
    claim_value: {
      wallet_binding_id: input.walletBindingId,
      wallet_address: input.walletAddress,
      chain: input.chain,
      chain_id: input.chainId ?? null,
      network: input.network ?? null,
      control_method: input.controlMethod,
      verified_at: verifiedAt,
    },
    issuer_id: CLAIM_ISSUERS.abraxas,
    assurance_level: input.assuranceLevel ?? "L3",
    issued_at: verifiedAt,
    expires_at: computeWalletControlExpiresAt(verifiedAt),
    revocation_reference: null,
    evidence_reference: walletControlEvidenceRef(input.walletBindingId),
    jurisdiction: null,
    policy_scope: "core",
  };
}

/** Partner-safe projection — boolean only, no address graph. */
export function sanitizeWalletControlClaimForPartner(
  claim: CredentialClaimRecord,
): Record<string, unknown> {
  return {
    claim_type: claim.claim_type,
    assurance_level: claim.assurance_level,
    issued_at: claim.issued_at,
    expires_at: claim.expires_at,
    issuer_id: claim.issuer_id,
    wallet_control_confirmed: true,
  };
}
