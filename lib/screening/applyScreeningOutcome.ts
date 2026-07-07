// FILE: lib/screening/applyScreeningOutcome.ts
// Partner-gated screening — writes screening_outcome claim when provider returns clear.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { upsertClaims } from "@/lib/credentials/claimsService";
import { CLAIM_ISSUERS } from "@/lib/credentials/claimSchema";
import { appendAuditEvent } from "@/lib/verification/audit";

export async function applyScreeningClear(input: {
  subjectId: string;
  providerRef: string;
  jurisdiction?: string;
  ttlHours?: number;
}): Promise<void> {
  const subject = normalizeSuiAddress(input.subjectId);
  const expiresAt = new Date(Date.now() + (input.ttlHours ?? 24) * 60 * 60 * 1000);

  await upsertClaims([{
    subject_id: subject,
    credential_jti: null,
    claim_type: "screening_outcome",
    claim_value: {
      outcome: "clear",
      provider: "screening_partner",
      reference: input.providerRef,
    },
    issuer_id: "issuer:screening-partner",
    assurance_level: "L2",
    issued_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
    revocation_reference: null,
    evidence_reference: input.providerRef,
    jurisdiction: input.jurisdiction ?? null,
    policy_scope: "compliance",
  }]);

  await appendAuditEvent({
    actor_type: "partner",
    actor_id: "screening_partner",
    action: "screening.clear",
    object_type: "subject",
    object_id: subject,
    metadata: { provider_ref: input.providerRef },
  });
}
