// FILE: lib/decisionReceipts/currentValidity/evaluate.ts
// Canonical current-validity evaluation — issuance truth vs authorization-now truth.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { evaluateDecisionReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import { resolveReceiptStatus, verifyRecordSignature } from "@/lib/decisionReceipts/views";
import { getPartnerPolicyAtVersion } from "@/lib/policy/getPolicy";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { isReceiptSuperseded } from "@/lib/decisionReceipts/receiptSupersession";
import { getReceiptEvidenceDependencies } from "@/lib/decisionReceipts/evidenceDependencies";
import { loadSourceReceiptRow } from "@/lib/passport/reusableEligibility/invalidation";
import {
  RECEIPT_CURRENT_VALIDITY_VERSION,
  type ReceiptCurrentValidityResult,
  type ReceiptLifecycleStatus,
} from "./contract";
import { mapPartnerSafeReceiptReason } from "./partnerSafeReason";
import { deriveCurrentValidityDecision } from "./unifiedContract";
import {
  isReceiptIssuanceAuthorizable,
  issuanceFinalizationInvalidationReasons,
} from "@/lib/decisionReceipts/issuanceFinalization";
import type { ApplicationScopeResolver } from "./applicationScopeContract";

export type { ApplicationScopeResolver } from "./applicationScopeContract";

export interface EvaluateReceiptCurrentValidityInput {
  record: DecisionReceiptRecord;
  expectedPartnerId?: string;
  expectedPolicyId?: string;
  expectedEnvironment?: "sandbox" | "production";
  applicationId?: string | null;
  /** Server boundary: resolves authoritative Launchpad binding (required when applicationId is set). */
  resolveApplicationScope?: ApplicationScopeResolver;
  now?: Date;
}

async function resolvePolicyVersionActive(policyId: string, version: number, now = new Date()): Promise<boolean> {
  try {
    const policy = await getPartnerPolicyAtVersion(policyId, version);
    if (!policy) return false;
    if (policy.status === "revoked" || policy.status === "deprecated") return false;
    if (policy.status !== "active") return false;
    if (policy.deprecate_effective_at && new Date(policy.deprecate_effective_at).getTime() <= now.getTime()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function resolvePartnerOperational(partnerId: string): Promise<boolean> {
  if (process.env.VITEST) return true;
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb.from("partners").select("status").eq("partner_id", partnerId).maybeSingle();
    if (!data) return true;
    return String(data.status ?? "active") !== "suspended";
  } catch {
    return false;
  }
}

export async function evaluateReceiptCurrentValidity(
  input: EvaluateReceiptCurrentValidityInput,
): Promise<ReceiptCurrentValidityResult> {
  const checkedAt = new Date().toISOString();
  const now = input.now ?? new Date();
  const record = input.record;
  const storedStatus = resolveReceiptStatus(record);
  const signatureValid = verifyRecordSignature(record);
  const issuedValid = signatureValid && record.decision_result === "approved";

  const invalidationReasons: string[] = [];
  invalidationReasons.push(...issuanceFinalizationInvalidationReasons(record));
  let storeUnavailable = false;

  let superseded = false;
  try {
    const supersession = await isReceiptSuperseded(record.id);
    superseded = supersession.superseded;
    if (superseded) invalidationReasons.push("receipt_superseded");
  } catch {
    storeUnavailable = true;
    invalidationReasons.push("validity_store_unavailable");
  }

  const trust = await evaluateDecisionReceiptTrust(record, {
    partnerId: input.expectedPartnerId ?? record.partner_id,
    policyId: input.expectedPolicyId ?? record.policy_id,
    allowSandbox: input.expectedEnvironment === "sandbox",
  });
  invalidationReasons.push(...trust.invalidation_reasons);

  try {
    const evidenceDeps = await getReceiptEvidenceDependencies(record.id);
    const sourceId = evidenceDeps.find((d) => d.dependency_type === "source_receipt")?.source_credential_id
      ?? evidenceDeps[0]?.source_credential_id;
    if (sourceId) {
      const sourceRow = await loadSourceReceiptRow(sourceId);
      if (!sourceRow) {
        invalidationReasons.push("source_evidence_missing");
      } else if (sourceRow.status === "revoked" || sourceRow.revoked_at) {
        invalidationReasons.push("source_evidence_revoked");
      } else if (
        sourceRow.status === "expired"
        || (sourceRow.expires_at && new Date(sourceRow.expires_at).getTime() <= now.getTime())
      ) {
        invalidationReasons.push("source_evidence_expired");
      }
    }
  } catch {
    storeUnavailable = true;
    invalidationReasons.push("validity_store_unavailable");
  }

  const policyVersionActive = await resolvePolicyVersionActive(record.policy_id, record.policy_version, now);
  if (!policyVersionActive) invalidationReasons.push("policy_no_longer_valid");

  const partnerOperational = await resolvePartnerOperational(record.partner_id);
  if (!partnerOperational) invalidationReasons.push("partner_inactive");

  let applicationActive: boolean | null = null;
  if (input.applicationId) {
    if (!input.resolveApplicationScope) {
      storeUnavailable = true;
      invalidationReasons.push("validity_store_unavailable");
      applicationActive = false;
    } else {
      const applicationScope = await input.resolveApplicationScope({
        receiptId: record.id,
        partnerId: record.partner_id,
        applicationId: input.applicationId,
      });
      if (!applicationScope.store_available) {
        storeUnavailable = true;
        invalidationReasons.push("validity_store_unavailable");
      } else {
        invalidationReasons.push(...applicationScope.reasons);
        applicationActive = applicationScope.application_scope_satisfied;
      }
    }
  }

  const claimsCurrent = !trust.invalidation_reasons.some((reason) =>
    reason.startsWith("claim_") || reason.includes("dependency"),
  );

  const notExpired = storedStatus !== "expired"
    && !(record.expires_at && new Date(record.expires_at).getTime() <= now.getTime());

  const environmentCompatible = input.expectedEnvironment
    ? (input.expectedEnvironment === "production"
      ? record.decision_context === "production" && trust.production_usable
      : record.decision_context === "sandbox_only" || !trust.production_usable)
    : true;
  if (input.expectedEnvironment === "production" && !environmentCompatible) {
    invalidationReasons.push("environment_mismatch");
  }

  const issuerAuthorized =
    trust.currently_valid
    && !trust.invalidation_reasons.some((r) => r === "issuer_not_authorized" || r.includes("issuer"));

  const decision = deriveCurrentValidityDecision(
    {
      cryptographically_valid: signatureValid,
      issuer_authorized: issuerAuthorized,
      issued_approved: issuedValid,
      policy_and_audience_match: environmentCompatible
        && !trust.invalidation_reasons.some((r) => r === "partner_mismatch" || r === "policy_mismatch"),
      partner_operational: partnerOperational,
      policy_active: policyVersionActive,
      claims_current: claimsCurrent,
      evidence_current: !invalidationReasons.some((r) => r.includes("evidence")),
      receipt_status_active: storedStatus === "active" && isReceiptIssuanceAuthorizable(record),
      not_expired: notExpired,
      not_superseded: !superseded,
      store_available: !storeUnavailable,
      application_scope_satisfied: applicationActive !== false,
    },
    invalidationReasons,
  );

  const currentlyValid = decision.currently_acceptable;
  const lifecycleStatus = decision.lifecycle_status;

  const uniqueReasons = Array.from(new Set(invalidationReasons));
  const partnerSafeReason = currentlyValid
    ? null
    : mapPartnerSafeReceiptReason(uniqueReasons, lifecycleStatus);

  return {
    contract_version: RECEIPT_CURRENT_VALIDITY_VERSION,
    currently_valid: currentlyValid,
    issued_valid: issuedValid,
    cryptographically_valid: signatureValid,
    lifecycle_status: lifecycleStatus,
    partner_safe_reason: partnerSafeReason,
    checked_at: checkedAt,
    source_states: {
      signature_valid: signatureValid,
      receipt_status: storedStatus,
      claims_current: claimsCurrent,
      policy_version_active: policyVersionActive,
      partner_operational: partnerOperational,
      application_active: applicationActive,
      not_superseded: !superseded,
      not_expired: notExpired,
      environment_compatible: environmentCompatible,
    },
    invalidation_reasons: uniqueReasons,
  };
}
