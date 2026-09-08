// FILE: lib/assurance/selfAttestation/selfAttestationClaims.ts
// Convert ledger rows to policy-evaluation claims — never authoritative for regulated actions.

import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import {
  SELF_ATTESTATION_ASSURANCE,
  SELF_ATTESTATION_CLAIM_TYPE,
  SELF_ATTESTATION_ISSUER,
  SELF_ATTESTATION_PROVENANCE,
} from "./constants";
import type { SelfAttestationLedgerRow } from "./selfAttestationLedger";

export function selfAttestationRowToClaim(row: SelfAttestationLedgerRow): CredentialClaimRecord {
  const now = Date.now();
  const expired = new Date(row.expires_at).getTime() < now;
  const revoked = Boolean(row.revoked_at);

  return {
    id: `self-attest:${row.id}`,
    subject_id: row.holder_ref,
    credential_jti: null,
    claim_type: SELF_ATTESTATION_CLAIM_TYPE,
    claim_value: {
      outcome: row.age_band,
      provenance: SELF_ATTESTATION_PROVENANCE,
      purpose: row.purpose,
      partner_id: row.partner_id,
      policy_id: row.policy_id,
    },
    issuer_id: SELF_ATTESTATION_ISSUER,
    assurance_level: SELF_ATTESTATION_ASSURANCE,
    issued_at: row.attested_at,
    expires_at: row.expires_at,
    status: revoked ? "revoked" : expired ? "expired" : "active",
    revocation_reference: row.revoked_at,
    evidence_reference: row.browse_receipt_id,
    jurisdiction: null,
    policy_scope: row.policy_id,
  };
}

export function ledgerRowsToClaims(rows: SelfAttestationLedgerRow[]): CredentialClaimRecord[] {
  return rows.map(selfAttestationRowToClaim);
}
