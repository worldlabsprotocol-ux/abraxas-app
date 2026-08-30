// FILE: lib/partner/verifyPartnerFlowReceipt.ts
// Server-side Partner Flow receipt validation against public receipt view.

import {
  evaluatePublicReceiptTrust,
  type TrustEvaluationResult,
} from "@/lib/decisionReceipts/trustEvaluation";

export const SUPPORTED_RECEIPT_SCHEMA_VERSION = "1.0.0";
export const EXPECTED_RECEIPT_ARTIFACT_TYPE = "eligibility_decision_receipt";
export const SANDBOX_ONLY_INVALIDATION_REASON = "production_not_usable:false";

export interface PartnerFlowPublicReceipt {
  receipt_id?: string;
  schema_version?: string;
  partner_id?: string;
  policy_id?: string;
  decision_result?: string;
  signature_valid?: boolean;
  expires_at?: string | null;
  status?: string;
  production_usable?: boolean;
  decision_context?: string;
  artifact_type?: string;
  evaluated_claim_refs?: Array<{
    claim_id?: string;
    claim_type?: string;
    issuer_id?: string;
    status?: string;
    issued_at?: string;
    expires_at?: string | null;
  }>;
  currently_valid?: boolean;
  validity?: string;
  invalidation_reasons?: string[];
}

export type PartnerFlowReceiptValidationMode = "sandbox" | "production";

export interface PartnerFlowReceiptExpectations {
  partnerId: string;
  policyId: string;
  /** Defaults to new Date() — inject in tests */
  now?: Date;
  /**
   * Strict environment validation. When omitted, legacy allowSandbox behavior applies.
   */
  mode?: PartnerFlowReceiptValidationMode;
  /**
   * When false (default), require production_usable === true.
   * Set true only for explicit sandbox / pilot policy testing (legacy path).
   */
  allowSandbox?: boolean;
}

export interface PartnerFlowReceiptValidationResult {
  ok: boolean;
  errors: string[];
  trust?: TrustEvaluationResult;
}

function validateSharedReceiptFields(
  receipt: PartnerFlowPublicReceipt,
  expected: Pick<PartnerFlowReceiptExpectations, "partnerId" | "policyId" | "now">,
): string[] {
  const errors: string[] = [];
  const now = expected.now ?? new Date();

  if (receipt.signature_valid !== true) {
    errors.push("signature_invalid");
  }

  if (receipt.decision_result !== "approved") {
    errors.push(`decision_not_approved:${receipt.decision_result ?? "missing"}`);
  }

  if (receipt.status !== "active") {
    errors.push(`status_not_active:${receipt.status ?? "missing"}`);
  }

  if (receipt.partner_id !== expected.partnerId) {
    errors.push(`partner_mismatch:expected=${expected.partnerId},got=${receipt.partner_id ?? "missing"}`);
  }

  if (receipt.policy_id !== expected.policyId) {
    errors.push(`policy_mismatch:expected=${expected.policyId},got=${receipt.policy_id ?? "missing"}`);
  }

  if (receipt.schema_version !== SUPPORTED_RECEIPT_SCHEMA_VERSION) {
    errors.push(`schema_version_unsupported:${receipt.schema_version ?? "missing"}`);
  }

  if (receipt.artifact_type !== EXPECTED_RECEIPT_ARTIFACT_TYPE) {
    errors.push(`artifact_type_mismatch:${receipt.artifact_type ?? "missing"}`);
  }

  if (receipt.expires_at == null || receipt.expires_at === "") {
    errors.push("expires_at_missing");
  } else {
    const expiresAt = new Date(receipt.expires_at);
    if (Number.isNaN(expiresAt.getTime())) {
      errors.push("expires_at_invalid");
    } else if (expiresAt.getTime() <= now.getTime()) {
      errors.push("receipt_expired");
    }
  }

  const claimRefs = receipt.evaluated_claim_refs ?? [];
  for (const ref of claimRefs) {
    const status = ref.status?.toLowerCase();
    if (status && status !== "active") {
      errors.push(`claim_not_active:${ref.claim_type ?? ref.claim_id ?? "unknown"}`);
    }
  }

  return errors;
}

function validateSandboxEnvironmentFields(receipt: PartnerFlowPublicReceipt): string[] {
  const errors: string[] = [];

  if (receipt.production_usable !== false) {
    errors.push(
      receipt.production_usable === undefined
        ? "sandbox_production_usable_missing"
        : "sandbox_production_usable_not_false",
    );
  }

  if (receipt.decision_context !== "sandbox_only") {
    errors.push(`sandbox_decision_context_mismatch:${receipt.decision_context ?? "missing"}`);
  }

  const reasons = receipt.invalidation_reasons ?? [];
  if (reasons.length !== 1 || reasons[0] !== SANDBOX_ONLY_INVALIDATION_REASON) {
    errors.push("sandbox_invalidation_reason_mismatch");
  }

  return errors;
}

function validateProductionEnvironmentFields(receipt: PartnerFlowPublicReceipt): string[] {
  const errors: string[] = [];

  if (receipt.production_usable !== true) {
    errors.push(
      receipt.production_usable === undefined
        ? "production_usable_missing"
        : "production_usable_not_true",
    );
  }

  if (receipt.currently_valid !== true) {
    errors.push("currently_valid_not_true");
  }

  if (receipt.decision_context !== "production") {
    errors.push(`production_decision_context_mismatch:${receipt.decision_context ?? "missing"}`);
  }

  if ((receipt.invalidation_reasons ?? []).length > 0) {
    errors.push("production_has_invalidation_reasons");
  }

  return errors;
}

export function validatePartnerFlowPublicReceipt(
  receipt: PartnerFlowPublicReceipt | null | undefined,
  expected: PartnerFlowReceiptExpectations,
): PartnerFlowReceiptValidationResult {
  if (!receipt || typeof receipt !== "object") {
    return {
      ok: false,
      errors: ["receipt_missing"],
    };
  }

  if (expected.mode) {
    const sharedErrors = validateSharedReceiptFields(receipt, expected);
    const modeErrors = expected.mode === "sandbox"
      ? validateSandboxEnvironmentFields(receipt)
      : validateProductionEnvironmentFields(receipt);
    const errors = [...sharedErrors, ...modeErrors];
    return { ok: errors.length === 0, errors };
  }

  const trust = evaluatePublicReceiptTrust(receipt, {
    partnerId: expected.partnerId,
    policyId: expected.policyId,
    allowSandbox: expected.allowSandbox,
    now: expected.now,
  });

  return {
    ok: trust.currently_valid,
    errors: trust.invalidation_reasons,
    trust,
  };
}
