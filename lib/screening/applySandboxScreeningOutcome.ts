// FILE: lib/screening/applySandboxScreeningOutcome.ts
// Demo screening — clearly labeled sandbox claim, not real AML/sanctions clearance.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { upsertClaims } from "@/lib/credentials/claimsService";
import {
  SANDBOX_ISSUER_ID,
  sandboxClaimMetadata,
} from "@/lib/credentials/sandboxClaims";
import { appendAuditEvent } from "@/lib/verification/audit";

export async function applySandboxScreeningClear(input: {
  subjectId: string;
  reference?: string;
  ttlHours?: number;
}): Promise<{ expires_at: string; created_at: string }> {
  const subject = normalizeSuiAddress(input.subjectId);
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + (input.ttlHours ?? 24) * 60 * 60 * 1000);
  const ref = input.reference ?? `sandbox:demo:${createdAt.getTime()}`;

  await upsertClaims([{
    subject_id: subject,
    credential_jti: null,
    claim_type: "screening_outcome",
    claim_value: {
      outcome: "clear",
      ...sandboxClaimMetadata(),
      note: "Demo screening only — not a real sanctions or AML clearance.",
    },
    issuer_id: SANDBOX_ISSUER_ID,
    assurance_level: "L1",
    issued_at: createdAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    revocation_reference: null,
    evidence_reference: ref,
    jurisdiction: null,
    policy_scope: "sandbox",
  }]);

  await appendAuditEvent({
    actor_type: "system",
    actor_id: "abraxas_sandbox",
    action: "screening.sandbox_demo",
    object_type: "subject",
    object_id: subject,
    metadata: { reference: ref, environment: "sandbox" },
  });

  return { expires_at: expiresAt.toISOString(), created_at: createdAt.toISOString() };
}
