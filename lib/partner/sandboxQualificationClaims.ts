// FILE: lib/partner/sandboxQualificationClaims.ts
// Server-derived sandbox claims. Cookie/query/client values never become claims.

import {
  CLAIM_ISSUERS,
  type CredentialClaimRecord,
} from "@/lib/credentials/claimSchema";
import { sandboxClaimMetadata } from "@/lib/credentials/sandboxClaims";
import {
  policyPackIsEconomicDemo,
  inferPolicyPackFromPolicyId,
} from "@/lib/partner/launchpad/policyPacks";
import {
  qualificationMatchesBinding,
  type MethodQualificationRecord,
} from "@/lib/partner/partnerMethodQualification";

const SANDBOX_METHODS = new Set(["privacy_preserving", "partner_age_check"]);

export function deriveServerSandboxQualificationClaims(input: {
  record: MethodQualificationRecord | null;
  subjectId: string;
  storedPartnerId: string;
  storedPolicyId: string;
  storedPolicyVersion?: number;
}): CredentialClaimRecord[] {
  const record = input.record;
  if (!record?.qualified || record.issuedReceipt !== false || record.sandboxOnly !== true) {
    return [];
  }
  if (!qualificationMatchesBinding({
    record,
    verifyRequestId: record.verifyRequestId,
    partnerId: input.storedPartnerId,
    policyId: input.storedPolicyId,
    policyVersion: input.storedPolicyVersion,
  })) {
    return [];
  }
  if (record.partnerId !== input.storedPartnerId.trim() || record.policyId !== input.storedPolicyId.trim()) {
    return [];
  }
  if (!SANDBOX_METHODS.has(record.methodId)) return [];

  const pack = inferPolicyPackFromPolicyId(input.storedPolicyId);
  if (!pack || !policyPackIsEconomicDemo(pack)) return [];

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + 30 * 60 * 1000);
  return [{
    id: `sandbox-qual:${record.verifyRequestId}:${record.methodId}`,
    subject_id: input.subjectId,
    credential_jti: null,
    claim_type: "product_eligibility",
    claim_value: {
      outcome: pack.disclosed_result,
      disclosed_result: pack.disclosed_result,
      action: pack.rules.product_eligibility_action ?? "sandbox_economic_demo",
      method_id: record.methodId,
      ...sandboxClaimMetadata(),
    },
    issuer_id: CLAIM_ISSUERS.sandbox,
    assurance_level: pack.minimum_assurance,
    issued_at: issuedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: "active",
    revocation_reference: null,
    evidence_reference: `partner_method_qualification:${record.methodId}`,
    jurisdiction: null,
    policy_scope: input.storedPolicyId,
  }];
}
