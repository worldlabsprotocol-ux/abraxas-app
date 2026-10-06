// FILE: lib/partner/verifyPartnerFlowReceipt.ts
// Server-side Partner Flow receipt validation against public receipt view.

import {
  evaluatePublicReceiptTrust,
  type TrustEvaluationResult,
} from "@/lib/decisionReceipts/trustEvaluation";
import {
  CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON,
  isPureSandboxOnlyLimitation,
  isSandboxOnlyInvalidationReasonSet,
  LEGACY_SANDBOX_ONLY_INVALIDATION_REASON,
} from "@/lib/partner/sandboxReceiptTrustContract";

export const SUPPORTED_RECEIPT_SCHEMA_VERSION = "1.0.0";
export const EXPECTED_RECEIPT_ARTIFACT_TYPE = "eligibility_decision_receipt";
/** @deprecated Prefer CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON from sandboxReceiptTrustContract. */
export const SANDBOX_ONLY_INVALIDATION_REASON = LEGACY_SANDBOX_ONLY_INVALIDATION_REASON;
export {
  CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON,
  LEGACY_SANDBOX_ONLY_INVALIDATION_REASON,
} from "@/lib/partner/sandboxReceiptTrustContract";

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
  issued_valid?: boolean;
  lifecycle_status?: string;
  partner_safe_reason?: string | null;
  validity_checked_at?: string;
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

  if (!isSandboxOnlyInvalidationReasonSet(receipt.invalidation_reasons)) {
    errors.push("sandbox_invalidation_reason_mismatch");
  }

  return errors;
}

function validateSandboxOperationalValidity(receipt: PartnerFlowPublicReceipt): string[] {
  const errors: string[] = [];
  const pureSandboxOnly = isPureSandboxOnlyLimitation(receipt);

  if (receipt.lifecycle_status === "superseded") errors.push("receipt_superseded");
  if (receipt.lifecycle_status === "revoked") errors.push("receipt_revoked");
  if (receipt.lifecycle_status === "expired") errors.push("receipt_expired");

  const safe = receipt.partner_safe_reason;
  if (safe === "evidence_refresh_required") errors.push("evidence_refresh_required");
  else if (safe === "policy_no_longer_valid") errors.push("policy_no_longer_valid");
  else if (safe === "application_inactive") errors.push("application_inactive");
  else if (safe === "receipt_superseded") errors.push("receipt_superseded");
  else if (safe === "receipt_revoked") errors.push("receipt_revoked");
  else if (safe === "receipt_expired") errors.push("receipt_expired");
  else if (safe === "signature_invalid") errors.push("signature_invalid");
  else if (safe === "verification_incomplete") errors.push("verification_incomplete");
  else if (safe === "partner_inactive") errors.push("partner_inactive");
  else if (safe === "receipt_invalid") errors.push("receipt_invalid");
  else if (receipt.currently_valid === false && !pureSandboxOnly) {
    if (safe === "environment_mismatch") errors.push(safe);
    else if (safe) errors.push(safe);
    else errors.push("currently_valid_not_true");
  }

  return errors;
}

function validateCurrentValidityFields(receipt: PartnerFlowPublicReceipt): string[] {
  const errors: string[] = [];
  if (receipt.lifecycle_status === "superseded") errors.push("receipt_superseded");
  if (receipt.lifecycle_status === "revoked") errors.push("receipt_revoked");
  if (receipt.lifecycle_status === "expired") errors.push("receipt_expired");
  if (receipt.currently_valid === false) {
    const safe = receipt.partner_safe_reason;
    if (safe === "evidence_refresh_required") errors.push("evidence_refresh_required");
    else if (safe === "policy_no_longer_valid") errors.push("policy_no_longer_valid");
    else if (safe === "application_inactive") errors.push("application_inactive");
    else if (safe === "receipt_superseded") errors.push("receipt_superseded");
    else if (safe) errors.push(safe);
    else errors.push("currently_valid_not_true");
  }
  return errors;
}

function validateProductionEnvironmentFields(receipt: PartnerFlowPublicReceipt): string[] {
  const errors: string[] = [];
  errors.push(...validateCurrentValidityFields(receipt));

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
      ? [...validateSandboxEnvironmentFields(receipt), ...validateSandboxOperationalValidity(receipt)]
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
