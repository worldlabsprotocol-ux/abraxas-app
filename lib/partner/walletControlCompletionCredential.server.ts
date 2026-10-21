// FILE: lib/partner/walletControlCompletionCredential.server.ts
// Server-only wallet_control completion credential ref from active claims.

import "server-only";

import { normalizePartnerFlowSubject } from "@/lib/auth/sessionSubject";
import { resolveActiveClaimsForRuntime } from "@/lib/credentials/activeClaims.server";
import { WALLET_CONTROL_CLAIM_TYPE } from "@/lib/walletControl/contract";

/** Wallet-control completion uses active wallet_binding_confirmed evidence, not passport JTIs. */
export async function resolveWalletControlCompletionCredentialRef(
  subjectId: string,
): Promise<string | null> {
  const subject = normalizePartnerFlowSubject(subjectId);
  const claims = await resolveActiveClaimsForRuntime(subject);
  const walletClaim = claims.find(
    (claim) => claim.claim_type === WALLET_CONTROL_CLAIM_TYPE && claim.status === "active",
  );
  if (!walletClaim) return null;
  if (walletClaim.evidence_reference?.trim()) {
    return walletClaim.evidence_reference.trim();
  }
  if (walletClaim.id) {
    return `urn:abraxas:claim:${walletClaim.id}`;
  }
  return null;
}
