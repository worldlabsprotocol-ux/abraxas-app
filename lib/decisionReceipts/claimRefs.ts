// FILE: lib/decisionReceipts/claimRefs.ts
// Build evaluated claim references from active claims — references only, no PII.

import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { EvaluatedClaimRef } from "@/lib/decisionReceipts/types";

export function buildEvaluatedClaimRefs(
  claims: CredentialClaimRecord[],
  claimTypes: string[],
): EvaluatedClaimRef[] {
  const byType = new Map<string, CredentialClaimRecord>();
  for (const claim of claims) {
    if (!byType.has(claim.claim_type)) byType.set(claim.claim_type, claim);
  }

  return claimTypes
    .map(type => byType.get(type))
    .filter((c): c is CredentialClaimRecord => Boolean(c))
    .map(claim => ({
      claim_id: claim.id,
      claim_type: claim.claim_type,
      issuer_id: claim.issuer_id,
      status: claim.status,
      issued_at: claim.issued_at,
      expires_at: claim.expires_at,
    }));
}

export function issuerRefsFromClaimRefs(refs: EvaluatedClaimRef[]): string[] {
  return Array.from(new Set(refs.map(r => r.issuer_id))).sort();
}

export function claimTypesFromEvaluation(claimsJson: Record<string, unknown>): string[] {
  return Object.keys(claimsJson).filter(k => k !== "core_only");
}
