// FILE: lib/decisionReceipts/validityResolver.ts
// Live receipt validity — original signed artifact preserved; validity computed at read time.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { resolveReceiptStatus, verifyRecordSignature } from "@/lib/decisionReceipts/views";
import { getReceiptDependencies } from "@/lib/decisionReceipts/dependencies";
import {
  getClaimById,
  resolveClaimStatusAtRead,
} from "@/lib/trust/credentialStatusRegistry";
import {
  getIssuerById,
  getIssuerSigningKey,
  isIssuerTrustedForClaim,
} from "@/lib/trust/issuerFramework";
import { isSandboxPolicyId } from "@/lib/partner/sandboxPartner";

export type ReceiptValidityState =
  | "active"
  | "invalidated"
  | "expired"
  | "suspended_dependency"
  | "revoked_dependency"
  | "under_review_dependency"
  | "issuer_key_revoked"
  | "issuer_untrusted"
  | "signature_invalid"
  | "sandbox_only";

export interface ReceiptValidityResult {
  validity: ReceiptValidityState;
  currently_valid: boolean;
  stored_status: string;
  signature_valid: boolean;
  invalidation_reasons: string[];
  dependency_claim_ids: string[];
}

export async function resolveReceiptValidity(
  record: DecisionReceiptRecord,
  trustContext?: { partnerId?: string; policyId?: string },
): Promise<ReceiptValidityResult> {
  const invalidationReasons: string[] = [];
  const storedStatus = resolveReceiptStatus(record);

  if (!verifyRecordSignature(record)) {
    return {
      validity: "signature_invalid",
      currently_valid: false,
      stored_status: storedStatus,
      signature_valid: false,
      invalidation_reasons: ["signature_invalid"],
      dependency_claim_ids: [],
    };
  }

  if (storedStatus === "revoked") {
    return {
      validity: "invalidated",
      currently_valid: false,
      stored_status: storedStatus,
      signature_valid: true,
      invalidation_reasons: ["receipt_revoked"],
      dependency_claim_ids: [],
    };
  }

  if (storedStatus === "expired" || (record.expires_at && new Date(record.expires_at) < new Date())) {
    return {
      validity: "expired",
      currently_valid: false,
      stored_status: "expired",
      signature_valid: true,
      invalidation_reasons: ["receipt_expired"],
      dependency_claim_ids: [],
    };
  }

  if (record.decision_context === "sandbox_only" || isSandboxPolicyId(record.policy_id)) {
    return {
      validity: "sandbox_only",
      currently_valid: false,
      stored_status: storedStatus,
      signature_valid: true,
      invalidation_reasons: ["sandbox_only_not_production_usable"],
      dependency_claim_ids: record.evaluated_claim_refs.map(r => r.claim_id),
    };
  }

  const deps = await getReceiptDependencies(record.id);
  const claimIds = deps.length
    ? deps.map(d => d.claim_id as string)
    : record.evaluated_claim_refs.map(r => r.claim_id);

  for (const dep of deps.length ? deps : record.evaluated_claim_refs.map(r => ({
    claim_id: r.claim_id,
    claim_type: r.claim_type,
    issuer_id: r.issuer_id,
    signing_key_id: null as string | null,
  }))) {
    const claimId = dep.claim_id as string;
    const claimType = dep.claim_type as string;
    const issuerId = dep.issuer_id as string;
    const signingKeyId = "signing_key_id" in dep ? (dep.signing_key_id as string | null) : null;

    const claimRow = await getClaimById(claimId);
    if (!claimRow) {
      invalidationReasons.push(`missing_claim:${claimId}`);
      continue;
    }

    const claimStatus = resolveClaimStatusAtRead({
      status: claimRow.status as Parameters<typeof resolveClaimStatusAtRead>[0]["status"],
      expires_at: (claimRow.expires_at as string | null) ?? null,
    });

    if (claimStatus === "revoked") {
      return buildInvalidResult(record, storedStatus, "revoked_dependency", [`claim_revoked:${claimId}`], claimIds);
    }
    if (claimStatus === "suspended") {
      return buildInvalidResult(record, storedStatus, "suspended_dependency", [`claim_suspended:${claimId}`], claimIds);
    }
    if (claimStatus === "under_review") {
      return buildInvalidResult(record, storedStatus, "under_review_dependency", [`claim_under_review:${claimId}`], claimIds);
    }
    if (claimStatus === "expired") {
      return buildInvalidResult(record, storedStatus, "expired", [`claim_expired:${claimId}`], claimIds);
    }

    const issuer = await getIssuerById(issuerId);
    if (!issuer || issuer.issuer_status !== "active") {
      return buildInvalidResult(record, storedStatus, "issuer_untrusted", [`issuer_inactive:${issuerId}`], claimIds);
    }

    if (trustContext?.partnerId) {
      const trusted = await isIssuerTrustedForClaim({
        partnerId: trustContext.partnerId,
        policyId: trustContext.policyId ?? record.policy_id,
        claimType,
        issuerId,
        assuranceLevel: (claimRow.assurance_level as string | null) ?? null,
        jurisdiction: (claimRow.jurisdiction as string | null) ?? null,
        issuedAt: claimRow.issued_at as string,
      });
      if (!trusted.ok) {
        return buildInvalidResult(record, storedStatus, "issuer_untrusted", [trusted.reason], claimIds);
      }
    }

    if (signingKeyId) {
      const key = await getIssuerSigningKey(signingKeyId);
      if (!key || key.status !== "active") {
        return buildInvalidResult(record, storedStatus, "issuer_key_revoked", [`signing_key_invalid:${signingKeyId}`], claimIds);
      }
    }
  }

  if (invalidationReasons.length > 0) {
    return buildInvalidResult(record, storedStatus, "invalidated", invalidationReasons, claimIds);
  }

  return {
    validity: "active",
    currently_valid: true,
    stored_status: storedStatus,
    signature_valid: true,
    invalidation_reasons: [],
    dependency_claim_ids: claimIds,
  };
}

function buildInvalidResult(
  record: DecisionReceiptRecord,
  storedStatus: string,
  validity: ReceiptValidityState,
  reasons: string[],
  claimIds: string[],
): ReceiptValidityResult {
  void record;
  return {
    validity,
    currently_valid: false,
    stored_status: storedStatus,
    signature_valid: true,
    invalidation_reasons: reasons,
    dependency_claim_ids: claimIds,
  };
}

/** Backward-compatible sync check for tests and legacy callers */
export function isReceiptCurrentlyValidSync(record: DecisionReceiptRecord): boolean {
  const storedStatus = resolveReceiptStatus(record);
  if (storedStatus !== "active") return false;
  if (record.decision_context === "sandbox_only") return false;
  if (isSandboxPolicyId(record.policy_id)) return false;
  return true;
}
