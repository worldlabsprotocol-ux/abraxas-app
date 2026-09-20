// FILE: lib/partner/partnerMethodQualification.ts
// Server-authoritative method selected vs qualified. Qualification never issues a receipt.

import type { EligibilityMethodId } from "@/lib/partner/eligibilityMethods";
import {
  inferPolicyPackFromPolicyId,
  policyPackIsEconomicDemo,
  policyPackIsSandboxOnly,
  policyPackRequiresIdentityEvidence,
  type PolicyPack,
} from "@/lib/partner/launchpad/policyPacks";

export const METHOD_NOT_QUALIFIED = "method_not_qualified" as const;

export type MethodQualificationState = "idle" | "selected" | "started" | "qualified" | "rejected";

export type MethodQualificationRecord = {
  verifyRequestId: string;
  partnerId: string;
  policyId: string;
  policyVersion?: number;
  methodId: EligibilityMethodId;
  state: MethodQualificationState;
  qualified: boolean;
  issuedReceipt: false;
  sandboxOnly: boolean;
};

export type MethodQualificationResult =
  | { ok: true; record: MethodQualificationRecord }
  | { ok: false; code: string; qualified: false; issuedReceipt: false };

const SANDBOX_COMPLETABLE: EligibilityMethodId[] = [
  "privacy_preserving",
  "partner_age_check",
];

export function resolvePackForMethodQualification(policyId: string): PolicyPack | null {
  return inferPolicyPackFromPolicyId(policyId);
}

export function evaluateMethodQualification(input: {
  methodId: EligibilityMethodId | string;
  storedPartnerId: string;
  storedPolicyId: string;
  storedPolicyVersion?: number;
  claimedPartnerId?: string;
  claimedPolicyId?: string;
  claimedPolicyVersion?: number;
  verifyRequestId: string;
  identityEvidenceComplete?: boolean;
  existingProofCompatible?: boolean;
}): MethodQualificationResult {
  const verifyRequestId = input.verifyRequestId.trim();
  const storedPartnerId = input.storedPartnerId.trim();
  const storedPolicyId = input.storedPolicyId.trim();
  if (!verifyRequestId || !storedPartnerId || !storedPolicyId) {
    return { ok: false, code: "missing", qualified: false, issuedReceipt: false };
  }
  if (input.claimedPartnerId && input.claimedPartnerId.trim() !== storedPartnerId) {
    return { ok: false, code: "cross_partner", qualified: false, issuedReceipt: false };
  }
  if (input.claimedPolicyId && input.claimedPolicyId.trim() !== storedPolicyId) {
    return { ok: false, code: "altered_policy", qualified: false, issuedReceipt: false };
  }
  if (
    input.claimedPolicyVersion != null
    && input.storedPolicyVersion != null
    && input.claimedPolicyVersion !== input.storedPolicyVersion
  ) {
    return { ok: false, code: "altered_version", qualified: false, issuedReceipt: false };
  }

  const pack = resolvePackForMethodQualification(storedPolicyId);
  const sandboxPack = pack ? policyPackIsEconomicDemo(pack) : false;
  const methodId = input.methodId as EligibilityMethodId;
  if (methodId === "account_login") {
    return { ok: false, code: "login_is_not_eligibility", qualified: false, issuedReceipt: false };
  }
  if (methodId === "reuse_existing_proof") {
    if (!input.existingProofCompatible) {
      return { ok: false, code: METHOD_NOT_QUALIFIED, qualified: false, issuedReceipt: false };
    }
    return {
      ok: true,
      record: {
        verifyRequestId,
        partnerId: storedPartnerId,
        policyId: storedPolicyId,
        policyVersion: input.storedPolicyVersion,
        methodId,
        state: "qualified",
        qualified: true,
        issuedReceipt: false,
        sandboxOnly: Boolean(pack && (sandboxPack || policyPackIsSandboxOnly(pack))),
      },
    };
  }
  if (methodId === "self_attestation") {
    return { ok: false, code: "self_attestation_cannot_qualify", qualified: false, issuedReceipt: false };
  }

  if (!pack && SANDBOX_COMPLETABLE.includes(methodId)) {
    return { ok: false, code: "sandbox_evidence_rejected", qualified: false, issuedReceipt: false };
  }
  if (!pack && methodId === "identity_liveness") {
    if (!input.identityEvidenceComplete) {
      return { ok: false, code: "identity_not_complete", qualified: false, issuedReceipt: false };
    }
    return {
      ok: true,
      record: {
        verifyRequestId,
        partnerId: storedPartnerId,
        policyId: storedPolicyId,
        policyVersion: input.storedPolicyVersion,
        methodId,
        state: "qualified",
        qualified: true,
        issuedReceipt: false,
        sandboxOnly: false,
      },
    };
  }
  if (!pack) {
    return { ok: false, code: "unknown_policy", qualified: false, issuedReceipt: false };
  }
  if (sandboxPack && SANDBOX_COMPLETABLE.includes(methodId)) {
    return {
      ok: true,
      record: {
        verifyRequestId,
        partnerId: storedPartnerId,
        policyId: storedPolicyId,
        policyVersion: input.storedPolicyVersion,
        methodId,
        state: "qualified",
        qualified: true,
        issuedReceipt: false,
        sandboxOnly: true,
      },
    };
  }

  if (!sandboxPack && SANDBOX_COMPLETABLE.includes(methodId) && policyPackRequiresIdentityEvidence(pack)) {
    return { ok: false, code: "sandbox_evidence_rejected", qualified: false, issuedReceipt: false };
  }

  if (methodId === "identity_liveness" && policyPackRequiresIdentityEvidence(pack)) {
    if (!input.identityEvidenceComplete) {
      return { ok: false, code: "identity_not_complete", qualified: false, issuedReceipt: false };
    }
    return {
      ok: true,
      record: {
        verifyRequestId,
        partnerId: storedPartnerId,
        policyId: storedPolicyId,
        policyVersion: input.storedPolicyVersion,
        methodId,
        state: "qualified",
        qualified: true,
        issuedReceipt: false,
        sandboxOnly: false,
      },
    };
  }

  return { ok: false, code: METHOD_NOT_QUALIFIED, qualified: false, issuedReceipt: false };
}

export function qualificationMatchesBinding(input: {
  record: MethodQualificationRecord | null;
  verifyRequestId: string;
  partnerId: string;
  policyId: string;
  policyVersion?: number;
}): boolean {
  if (!input.record?.qualified) return false;
  if (input.record.verifyRequestId !== input.verifyRequestId.trim()) return false;
  if (input.record.partnerId !== input.partnerId.trim()) return false;
  if (input.record.policyId !== input.policyId.trim()) return false;
  if (
    input.policyVersion != null
    && input.record.policyVersion != null
    && input.record.policyVersion !== input.policyVersion
  ) {
    return false;
  }
  if (input.record.issuedReceipt !== false) return false;
  return true;
}

export function publicQualificationView(record: MethodQualificationRecord | null): {
  ok: true;
  method_selected: false;
  method_qualified: boolean;
  issuedReceipt: false;
  sandbox_only: boolean;
} {
  return {
    ok: true,
    method_selected: false,
    method_qualified: Boolean(record?.qualified),
    issuedReceipt: false,
    sandbox_only: Boolean(record?.sandboxOnly),
  };
}
