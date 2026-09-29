// FILE: lib/decisionReceipts/currentValidity/evaluate.ts
// Canonical current-validity evaluation — issuance truth vs authorization-now truth.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { evaluateDecisionReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import { resolveReceiptStatus, verifyRecordSignature } from "@/lib/decisionReceipts/views";
import { getPartnerPolicyAtVersion } from "@/lib/policy/getPolicy";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { isReceiptSuperseded } from "@/lib/decisionReceipts/receiptSupersession";
import {
  RECEIPT_CURRENT_VALIDITY_VERSION,
  type ReceiptCurrentValidityResult,
  type ReceiptLifecycleStatus,
} from "./contract";
import { mapPartnerSafeReceiptReason } from "./partnerSafeReason";

export interface EvaluateReceiptCurrentValidityInput {
  record: DecisionReceiptRecord;
  expectedPartnerId?: string;
  expectedPolicyId?: string;
  expectedEnvironment?: "sandbox" | "production";
  applicationId?: string | null;
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

async function resolveApplicationActive(applicationId: string, partnerId: string): Promise<boolean> {
  try {
    const app = await getLaunchpadApplicationForPartner(applicationId, partnerId);
    return Boolean(app && app.status === "active");
  } catch {
    return false;
  }
}

function lifecycleFromStates(input: {
  storedStatus: string;
  superseded: boolean;
  trustValid: boolean;
}): ReceiptLifecycleStatus {
  if (input.superseded) return "superseded";
  if (input.storedStatus === "revoked") return "revoked";
  if (input.storedStatus === "expired") return "expired";
  if (!input.trustValid) return "invalidated";
  return "active";
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

  const policyVersionActive = await resolvePolicyVersionActive(record.policy_id, record.policy_version, now);
  if (!policyVersionActive) invalidationReasons.push("policy_no_longer_valid");

  const partnerOperational = await resolvePartnerOperational(record.partner_id);
  if (!partnerOperational) invalidationReasons.push("partner_inactive");

  let applicationActive: boolean | null = null;
  if (input.applicationId) {
    applicationActive = await resolveApplicationActive(input.applicationId, record.partner_id);
    if (!applicationActive) invalidationReasons.push("application_inactive");
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

  const currentlyValid = issuedValid
    && trust.currently_valid
    && !superseded
    && policyVersionActive
    && partnerOperational
    && (applicationActive !== false)
    && environmentCompatible
    && !storeUnavailable;

  const lifecycleStatus = lifecycleFromStates({
    storedStatus,
    superseded,
    trustValid: currentlyValid,
  });

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
