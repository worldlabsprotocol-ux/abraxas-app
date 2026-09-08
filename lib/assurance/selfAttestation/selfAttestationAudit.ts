// FILE: lib/assurance/selfAttestation/selfAttestationAudit.ts
// Privacy-safe audit events — never log DOB.

import { createHash } from "crypto";

export function emitSelfAttestationAuditEvent(input: {
  event: "self_attest_submitted" | "self_attest_denied" | "browse_receipt_issued";
  holderRef?: string;
  partnerId: string;
  policyId: string;
  purpose: string;
  ageBand?: string;
  code?: string;
}): void {
  const payload = {
    type: "self_attestation_audit",
    ts: new Date().toISOString(),
    event: input.event,
    partner_id: input.partnerId,
    policy_id: input.policyId,
    purpose: input.purpose,
    ...(input.holderRef ? { holder_ref_hash: hashHolderRef(input.holderRef) } : {}),
    ...(input.ageBand ? { age_band: input.ageBand } : {}),
    ...(input.code ? { code: input.code } : {}),
  };
  // Structured log without PII — production pipelines should route to audit store.
  console.info(JSON.stringify(payload));
}

function hashHolderRef(holderRef: string): string {
  return createHash("sha256").update(holderRef).digest("hex").slice(0, 16);
}
