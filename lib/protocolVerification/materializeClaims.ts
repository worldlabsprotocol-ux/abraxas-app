// FILE: lib/protocolVerification/materializeClaims.ts

import type { CredentialClaimRecord, ClaimType } from "@/lib/credentials/claimSchema";
import { sandboxClaimMetadata } from "@/lib/credentials/sandboxClaims";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";

export function materializeCredentialClaims(input: {
  walletSubject: string;
  claimRefs: Array<{ claim_id: string; claim_type: string; issuer_id: string; status: string }>;
  now: Date;
  sandboxOnly: boolean;
}): CredentialClaimRecord[] {
  const subjectId = subjectPseudonymId(input.walletSubject);
  const issuedAt = input.now.toISOString();
  return input.claimRefs.map((ref) => {
    const claimType = ref.claim_type as ClaimType;
    const claimValue: Record<string, unknown> =
      input.sandboxOnly && ref.issuer_id !== "issuer:wallet_signature"
        ? { ...sandboxClaimMetadata(), claim_id: ref.claim_id }
        : { binding: "wallet_signature", claim_id: ref.claim_id };
    return {
      id: ref.claim_id,
      subject_id: subjectId,
      credential_jti: null,
      claim_type: claimType,
      claim_value: claimValue,
      issuer_id: ref.issuer_id,
      assurance_level: ref.claim_type === "wallet_binding_confirmed" ? "L1" : "L2",
      issued_at: issuedAt,
      expires_at: null,
      status: ref.status === "revoked" ? "revoked" : ref.status === "expired" ? "expired" : "active",
      revocation_reference: null,
      evidence_reference: null,
      jurisdiction: null,
      policy_scope: null,
    };
  });
}
