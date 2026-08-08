// FILE: lib/decisionReceipts/trustEvaluation.ts
// Authoritative fail-closed trust evaluation for decisions and public receipts.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { isSandboxPolicyId } from "@/lib/partner/sandboxPartner";
import {
  resolveReceiptValidity,
  type ReceiptValidityResult,
  type ReceiptValidityState,
} from "@/lib/decisionReceipts/validityResolver";
import { resolveReceiptStatus, verifyRecordSignature } from "@/lib/decisionReceipts/views";

export type TrustValidityState =
  | ReceiptValidityState
  | "access_revoked"
  | "decision_not_approved"
  | "decision_manual_review"
  | "partner_mismatch"
  | "policy_mismatch";

export interface TrustEvaluationResult {
  currently_valid: boolean;
  validity: TrustValidityState;
  signature_valid: boolean;
  production_usable: boolean;
  invalidation_reasons: string[];
}

export interface TrustEvaluationContext {
  partnerId?: string;
  policyId?: string;
  allowSandbox?: boolean;
  now?: Date;
  /** Public receipt path — preserve granular production_usable invalidation reasons. */
  productionUsableRaw?: boolean | null;
}

function productionUsableForRecord(input: {
  decision_context: string;
  policy_id: string;
}): boolean {
  return input.decision_context === "production" && !isSandboxPolicyId(input.policy_id);
}

function resolveSyncClaimInvalidation(
  claimRefs: PartnerFlowPublicReceipt["evaluated_claim_refs"],
): string | null {
  if (!claimRefs?.length) return null;
  for (const ref of claimRefs) {
    const status = ref.status?.toLowerCase();
    if (status === "revoked") return "claim_revoked";
    if (status === "suspended" || status === "under_review") return "access_revoked";
    if (status === "expired") return "claim_expired";
  }
  return null;
}

function applyTrustGates(
  base: Pick<ReceiptValidityResult, "currently_valid" | "signature_valid" | "invalidation_reasons"> & {
    validity: TrustValidityState;
  },
  record: {
    decision_result: string;
    partner_id: string;
    policy_id: string;
    decision_context?: string;
  },
  context?: TrustEvaluationContext,
): TrustEvaluationResult {
  const production_usable = productionUsableForRecord({
    decision_context: record.decision_context ?? "production",
    policy_id: record.policy_id,
  });
  const allowSandbox = context?.allowSandbox === true;

  if (!base.signature_valid) {
    return {
      currently_valid: false,
      validity: base.validity,
      signature_valid: false,
      production_usable,
      invalidation_reasons: base.invalidation_reasons.length
        ? base.invalidation_reasons
        : ["signature_invalid"],
    };
  }

  if (record.decision_result !== "approved") {
    const validity: TrustValidityState =
      record.decision_result === "manual_review" ? "decision_manual_review" : "decision_not_approved";
    return {
      currently_valid: false,
      validity,
      signature_valid: true,
      production_usable,
      invalidation_reasons: [`decision_not_approved:${record.decision_result}`],
    };
  }

  if (context?.partnerId && record.partner_id !== context.partnerId) {
    return {
      currently_valid: false,
      validity: "partner_mismatch",
      signature_valid: true,
      production_usable,
      invalidation_reasons: [`partner_mismatch:expected=${context.partnerId},got=${record.partner_id}`],
    };
  }

  if (context?.policyId && record.policy_id !== context.policyId) {
    return {
      currently_valid: false,
      validity: "policy_mismatch",
      signature_valid: true,
      production_usable,
      invalidation_reasons: [`policy_mismatch:expected=${context.policyId},got=${record.policy_id}`],
    };
  }

  if (!base.currently_valid) {
    return {
      currently_valid: false,
      validity: base.validity,
      signature_valid: true,
      production_usable,
      invalidation_reasons: base.invalidation_reasons,
    };
  }

  if (!allowSandbox && !production_usable) {
    let productionReason = "production_not_usable";
    if (context?.productionUsableRaw === false) {
      productionReason = "production_not_usable:false";
    } else if (context?.productionUsableRaw !== true) {
      productionReason = "production_not_usable:missing";
    }
    return {
      currently_valid: false,
      validity: "sandbox_only",
      signature_valid: true,
      production_usable: false,
      invalidation_reasons: [productionReason],
    };
  }

  return {
    currently_valid: true,
    validity: "active",
    signature_valid: true,
    production_usable,
    invalidation_reasons: [],
  };
}

/** Full async evaluation — claim/issuer dependencies + decision gates. */
export async function evaluateDecisionReceiptTrust(
  record: DecisionReceiptRecord,
  context?: TrustEvaluationContext,
): Promise<TrustEvaluationResult> {
  const base = await resolveReceiptValidity(record, {
    partnerId: context?.partnerId,
    policyId: context?.policyId,
  });
  return applyTrustGates(base, record, context);
}

/** Sync evaluation for public receipt views (no claim dependency walk). */
export function evaluatePublicReceiptTrust(
  receipt: PartnerFlowPublicReceipt | null | undefined,
  context: TrustEvaluationContext & { partnerId: string; policyId: string },
): TrustEvaluationResult {
  const now = context.now ?? new Date();

  if (!receipt || typeof receipt !== "object") {
    return {
      currently_valid: false,
      validity: "invalidated",
      signature_valid: false,
      production_usable: false,
      invalidation_reasons: ["receipt_missing"],
    };
  }

  const signature_valid = receipt.signature_valid === true;
  const storedStatus = receipt.status;
  const production_usable = receipt.production_usable === true;

  let base: Pick<ReceiptValidityResult, "currently_valid" | "signature_valid" | "invalidation_reasons"> & {
    validity: TrustValidityState;
  };

  if (!signature_valid) {
    base = {
      currently_valid: false,
      validity: "signature_invalid",
      signature_valid: false,
      invalidation_reasons: ["signature_invalid"],
    };
  } else if (storedStatus === "revoked") {
    base = {
      currently_valid: false,
      validity: "access_revoked",
      signature_valid: true,
      invalidation_reasons: ["receipt_revoked"],
    };
  } else if (storedStatus == null || storedStatus === "") {
    base = {
      currently_valid: false,
      validity: "invalidated",
      signature_valid: true,
      invalidation_reasons: ["status_not_active:missing"],
    };
  } else if (storedStatus !== "active") {
    base = {
      currently_valid: false,
      validity: storedStatus === "expired" ? "expired" : "invalidated",
      signature_valid: true,
      invalidation_reasons: [`status_not_active:${storedStatus}`],
    };
  } else if (receipt.expires_at == null || receipt.expires_at === "") {
    base = {
      currently_valid: false,
      validity: "expired",
      signature_valid: true,
      invalidation_reasons: ["expires_at_missing"],
    };
  } else if (Number.isNaN(new Date(receipt.expires_at).getTime())) {
    base = {
      currently_valid: false,
      validity: "expired",
      signature_valid: true,
      invalidation_reasons: ["expires_at_invalid"],
    };
  } else if (new Date(receipt.expires_at).getTime() <= now.getTime()) {
    base = {
      currently_valid: false,
      validity: "expired",
      signature_valid: true,
      invalidation_reasons: ["receipt_expired"],
    };
  } else {
    const claimInvalidation = resolveSyncClaimInvalidation(receipt.evaluated_claim_refs);
    if (claimInvalidation) {
      base = {
        currently_valid: false,
        validity: "access_revoked",
        signature_valid: true,
        invalidation_reasons: [claimInvalidation],
      };
    } else if (
      receipt.currently_valid === false
      && Array.isArray(receipt.invalidation_reasons)
      && receipt.invalidation_reasons.length > 0
    ) {
      base = {
        currently_valid: false,
        validity: (receipt.validity as TrustValidityState | undefined) ?? "access_revoked",
        signature_valid: true,
        invalidation_reasons: receipt.invalidation_reasons,
      };
    } else {
      base = {
        currently_valid: true,
        validity: "active",
        signature_valid: true,
        invalidation_reasons: [],
      };
    }
  }

  return applyTrustGates(
    base,
    {
      decision_result: receipt.decision_result ?? "missing",
      partner_id: receipt.partner_id ?? "",
      policy_id: receipt.policy_id ?? "",
      decision_context: production_usable ? "production" : "sandbox_only",
    },
    { ...context, productionUsableRaw: receipt.production_usable },
  );
}

/** Sync record-level pre-check before async dependency walk. */
export function evaluateDecisionReceiptTrustSync(
  record: DecisionReceiptRecord,
  context?: TrustEvaluationContext,
): TrustEvaluationResult {
  const storedStatus = resolveReceiptStatus(record);
  const signature_valid = verifyRecordSignature(record);

  let base: Pick<ReceiptValidityResult, "currently_valid" | "signature_valid" | "invalidation_reasons"> & {
    validity: TrustValidityState;
  };

  if (!signature_valid) {
    base = {
      currently_valid: false,
      validity: "signature_invalid",
      signature_valid: false,
      invalidation_reasons: ["signature_invalid"],
    };
  } else if (storedStatus === "revoked") {
    base = {
      currently_valid: false,
      validity: "invalidated",
      signature_valid: true,
      invalidation_reasons: ["receipt_revoked"],
    };
  } else if (storedStatus === "expired" || (record.expires_at && new Date(record.expires_at) < new Date())) {
    base = {
      currently_valid: false,
      validity: "expired",
      signature_valid: true,
      invalidation_reasons: ["receipt_expired"],
    };
  } else if (record.decision_context === "sandbox_only" || isSandboxPolicyId(record.policy_id)) {
    base = {
      currently_valid: false,
      validity: "sandbox_only",
      signature_valid: true,
      invalidation_reasons: ["sandbox_only_not_production_usable"],
    };
  } else {
    base = {
      currently_valid: true,
      validity: "active",
      signature_valid: true,
      invalidation_reasons: [],
    };
  }

  return applyTrustGates(base, record, context);
}
