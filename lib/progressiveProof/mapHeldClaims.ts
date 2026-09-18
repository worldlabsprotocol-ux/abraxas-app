// FILE: lib/progressiveProof/mapHeldClaims.ts

import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { resolveClaimStatusAtRead } from "@/lib/trust/credentialStatusRegistry";
import type { HeldClaimRecord } from "@/lib/progressiveProof/types";

export function mapCredentialClaimToHeld(record: CredentialClaimRecord): HeldClaimRecord {
  const liveStatus = resolveClaimStatusAtRead({
    status: record.status,
    expires_at: record.expires_at,
  });

  return {
    claimType: record.claim_type,
    issuerId: record.issuer_id,
    assuranceLevel: record.assurance_level,
    issuedAt: record.issued_at,
    expiresAt: record.expires_at,
    status: liveStatus,
    consentScope: record.policy_scope,
    walletBindingRequired: record.claim_type === "wallet_binding_confirmed",
    credentialJti: record.credential_jti,
  };
}
