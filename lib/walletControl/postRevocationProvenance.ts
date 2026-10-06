// FILE: lib/walletControl/postRevocationProvenance.ts
// Post-revocation wallet-control provenance — fail closed on repair-minted evidence.

import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { WalletBindingAuthorityRow } from "@/lib/walletControl/claimBindingLineage";
import { parseBindingIdFromWalletControlClaim } from "@/lib/walletControl/claimBindingLineage";
import { classifyExplicitWalletControlProof } from "@/lib/walletControl/explicitWalletControlProof";
import { getLatestHolderIntentWalletRevocation } from "@/lib/walletControl/holderIntentRevocationHistory";

export const WALLET_CONTROL_PROVENANCE_INSUFFICIENT = "wallet_control_provenance_insufficient" as const;
export const WALLET_CONTROL_PROOF_PREDATES_REVOCATION = "wallet_control_proof_predates_revocation" as const;

export interface PostRevocationProvenanceResult {
  eligible: boolean;
  reason: string | null;
}

/** Pure evaluation when holder-intent revocation time is already known. */
export function evaluatePostRevocationProvenanceAtRevocation(input: {
  claim: Pick<CredentialClaimRecord, "issued_at" | "claim_value">;
  binding: WalletBindingAuthorityRow | null;
  holderRevokedAt: string;
}): PostRevocationProvenanceResult {
  const claimIssuedMs = new Date(input.claim.issued_at).getTime();
  const revokedMs = new Date(input.holderRevokedAt).getTime();

  if (Number.isNaN(claimIssuedMs) || Number.isNaN(revokedMs)) {
    return { eligible: false, reason: WALLET_CONTROL_PROVENANCE_INSUFFICIENT };
  }

  if (claimIssuedMs <= revokedMs) {
    return { eligible: false, reason: WALLET_CONTROL_PROOF_PREDATES_REVOCATION };
  }

  const proof = classifyExplicitWalletControlProof(input.claim, input.binding);
  if (proof.proofClass === "explicit") {
    return { eligible: true, reason: null };
  }

  return { eligible: false, reason: WALLET_CONTROL_PROVENANCE_INSUFFICIENT };
}

/** Detect repair-minted contamination pattern (deterministic, not UUID-specific). */
export function isRepairMintedContaminatedWalletControlClaim(input: {
  claim: Pick<CredentialClaimRecord, "issued_at" | "claim_value" | "claim_type" | "status">;
  binding: WalletBindingAuthorityRow | null;
  holderRevokedAt: string | null;
}): boolean {
  if (input.claim.claim_type !== "wallet_binding_confirmed") return false;
  if (!input.holderRevokedAt) return false;

  const result = evaluatePostRevocationProvenanceAtRevocation({
    claim: input.claim,
    binding: input.binding,
    holderRevokedAt: input.holderRevokedAt,
  });
  return !result.eligible;
}

export async function evaluatePostRevocationWalletControlProvenance(
  claim: CredentialClaimRecord,
  binding: WalletBindingAuthorityRow | null,
): Promise<PostRevocationProvenanceResult> {
  const bindingId = parseBindingIdFromWalletControlClaim(claim) ?? binding?.id ?? null;
  if (!bindingId) {
    return { eligible: false, reason: "wallet_binding_lineage_ambiguous" };
  }

  const holderRevocation = await getLatestHolderIntentWalletRevocation(bindingId);
  if (!holderRevocation) {
    return { eligible: true, reason: null };
  }

  return evaluatePostRevocationProvenanceAtRevocation({
    claim,
    binding,
    holderRevokedAt: holderRevocation.revokedAt,
  });
}
