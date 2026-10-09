// FILE: lib/assurance/selfAttestation/receiptDependency.ts
// Resolve L0 self-attestation ledger rows for receipt validity — not credential_claims.

import {
  SELF_ATTESTATION_CLAIM_TYPE,
  SELF_ATTESTATION_ISSUER,
} from "./constants";
import { getSelfAttestationById } from "./selfAttestationLedger";

export function parseSelfAttestationSyntheticClaimId(claimId: string): string | null {
  const prefix = "self-attest:";
  if (!claimId.startsWith(prefix)) return null;
  const ledgerId = claimId.slice(prefix.length).trim();
  return ledgerId || null;
}

export async function validateSelfAttestationReceiptDependency(input: {
  claimId: string;
  claimType: string;
  issuerId: string;
  now?: Date;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const ledgerId = parseSelfAttestationSyntheticClaimId(input.claimId);
  if (!ledgerId) {
    return { ok: false, reason: `missing_claim:${input.claimId}` };
  }
  if (input.claimType !== SELF_ATTESTATION_CLAIM_TYPE) {
    return { ok: false, reason: `claim_type_mismatch:${input.claimType}` };
  }
  if (input.issuerId !== SELF_ATTESTATION_ISSUER) {
    return { ok: false, reason: `issuer_mismatch:${input.issuerId}` };
  }

  const row = await getSelfAttestationById(ledgerId);
  if (!row) {
    return { ok: false, reason: `missing_claim:${input.claimId}` };
  }
  if (row.revoked_at) {
    return { ok: false, reason: `claim_revoked:${input.claimId}` };
  }
  const now = input.now ?? new Date();
  if (new Date(row.expires_at).getTime() <= now.getTime()) {
    return { ok: false, reason: `claim_expired:${input.claimId}` };
  }
  return { ok: true };
}
