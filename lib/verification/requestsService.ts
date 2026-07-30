// FILE: lib/verification/requestsService.ts
// Partner verification requests, consent, and policy decisions.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { claimTypeLabel, type ClaimType } from "@/lib/credentials/claimSchema";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { getPartnerPolicy } from "@/lib/policy/getPolicy";
import { assertPolicyBelongsToPartner } from "@/lib/policy/assertPolicyOwnership";
import { evaluatePolicyForSubject } from "@/lib/policy/evaluateSubjectPolicy";
import type { PolicyDecisionRecord } from "@/lib/policy/types";
import { appendAuditEvent } from "@/lib/verification/audit";
import {
  buildEvaluatedClaimRefs,
  claimTypesFromEvaluation,
} from "@/lib/decisionReceipts/claimRefs";
import { issueReceiptForDecision } from "@/lib/decisionReceipts/service";
import { isSandboxPolicyId } from "@/lib/partner/sandboxPartner";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://abraxas-app.vercel.app";

export { getPartnerPolicy as getPolicy } from "@/lib/policy/getPolicy";

export async function createVerificationRequest(input: {
  partnerId: string;
  policyId: string;
  requestedAction?: string;
  requestedClaims?: string[];
  suiAddress?: string;
  returnUrl?: string;
}): Promise<{ request_id: string; consent_url: string; expires_at: string }> {
  const sb = requireSupabaseAdmin();
  const policy = await getPartnerPolicy(input.policyId);
  if (!policy) throw new Error("Policy not found");
  assertPolicyBelongsToPartner(policy, input.partnerId);

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const requestedClaims = input.requestedClaims?.length
    ? input.requestedClaims
    : (policy.rules_json.required_claims ?? []).map(r => r.claim_type);

  const { data, error } = await sb.from("verification_requests").insert({
    partner_id: input.partnerId,
    policy_id: input.policyId,
    requested_action: input.requestedAction ?? null,
    requested_claims: requestedClaims,
    sui_address: input.suiAddress ? normalizeSuiAddress(input.suiAddress) : null,
    status: "pending",
    expires_at: expiresAt,
  }).select("id").single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create request");

  await appendAuditEvent({
    actor_type: "partner",
    actor_id: input.partnerId,
    action: "verification_request.created",
    object_type: "verification_request",
    object_id: data.id as string,
    policy_id: input.policyId,
    policy_version: policy.version,
    metadata: { requested_action: input.requestedAction },
  });

  const consentParams = new URLSearchParams({ verify_request: data.id as string });
  if (input.returnUrl) {
    consentParams.set("return", input.returnUrl);
    consentParams.set("partner_id", input.partnerId);
    consentParams.set("policy_id", input.policyId);
  }

  return {
    request_id: data.id as string,
    consent_url: `${APP_URL}/passport?${consentParams.toString()}`,
    expires_at: expiresAt,
  };
}

export interface VerificationRequestPreview {
  request_id: string;
  partner_id: string;
  policy_id: string;
  policy_name: string;
  requested_action: string | null;
  requested_claims: string[];
  claim_labels: { claim_type: string; label: string; will_share: boolean }[];
  never_shared: string[];
  expires_at: string;
  status: string;
}

/** Holder preview before consent — no decision yet */
export async function getVerificationRequestPreview(
  requestId: string,
): Promise<VerificationRequestPreview | null> {
  const sb = requireSupabaseAdmin();
  const { data: request } = await sb
    .from("verification_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) return null;

  const policy = await getPartnerPolicy(request.policy_id as string);
  const requestedClaims = (request.requested_claims as string[]) ?? [];
  const policyClaims = (policy?.rules_json.required_claims ?? []).map(r => r.claim_type);
  const allClaims = Array.from(new Set([...requestedClaims, ...policyClaims]));

  return {
    request_id: requestId,
    partner_id: request.partner_id as string,
    policy_id: request.policy_id as string,
    policy_name: policy?.name ?? request.policy_id as string,
    requested_action: (request.requested_action as string | null) ?? null,
    requested_claims: allClaims,
    claim_labels: allClaims.map(ct => ({
      claim_type: ct,
      label: claimTypeLabel(ct as ClaimType),
      will_share: true,
    })),
    never_shared: [
      "Passport image",
      "Passport number",
      "Full date of birth",
      "Home address",
      "Selfie / biometric data",
      "Tax or financial documents",
    ],
    expires_at: request.expires_at as string,
    status: request.status as string,
  };
}

export async function consentAndDecide(input: {
  requestId: string;
  suiAddress: string;
}): Promise<{
  decision_id: string;
  receipt_id: string | null;
  decision: string;
  claims: Record<string, unknown>;
  reason_codes: string[];
  valid_until: string | null;
}> {
  const sb = requireSupabaseAdmin();
  const subject = normalizeSuiAddress(input.suiAddress);

  const { data: request } = await sb
    .from("verification_requests")
    .select("*")
    .eq("id", input.requestId)
    .maybeSingle();

  if (!request) throw new Error("Request not found");

  if (request.status === "decided") {
    return getExistingConsentDecision(input.requestId, subject);
  }

  if (new Date(request.expires_at as string) < new Date()) {
    await sb.from("verification_requests").update({ status: "expired" }).eq("id", input.requestId);
    throw new Error("Request expired");
  }

  if (request.sui_address && normalizeSuiAddress(request.sui_address as string) !== subject) {
    throw new Error("This request is for a different Passport");
  }

  const partnerId = request.partner_id as string;
  const { policy, evaluation, claims } = await evaluatePolicyForSubject({
    suiAddress: subject,
    policyId: request.policy_id as string,
    partnerId,
  });

  const { data: claimed, error: claimError } = await sb
    .from("verification_requests")
    .update({
      status: "decided",
      subject_id: subject,
      sui_address: subject,
    })
    .eq("id", input.requestId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (claimError) throw new Error(claimError.message);

  if (!claimed) {
    return getExistingConsentDecision(input.requestId, subject);
  }

  const { data: consent } = await sb.from("consent_receipts").insert({
    subject_id: subject,
    partner_id: partnerId,
    request_id: input.requestId,
    purpose: request.requested_action as string,
    claims_authorized: Object.keys(evaluation.claims),
    expires_at: evaluation.valid_until,
  }).select("id").single();

  const { data: decisionRow } = await sb.from("verification_decisions").insert({
    request_id: input.requestId,
    partner_id: partnerId,
    subject_id: subject,
    policy_id: policy.id,
    policy_version: policy.version,
    decision: evaluation.decision,
    claims_json: evaluation.claims,
    reason_codes: evaluation.reason_codes,
    valid_until: evaluation.valid_until,
    status: "active",
  }).select("id").single();

  if (consent?.id) {
    await sb.from("verification_requests")
      .update({ consent_id: consent.id })
      .eq("id", input.requestId);
  }

  await appendAuditEvent({
    actor_type: "subject",
    actor_id: subject,
    action: "verification.decided",
    object_type: "verification_decision",
    object_id: decisionRow?.id as string,
    policy_id: policy.id,
    policy_version: policy.version,
    metadata: {
      decision: evaluation.decision,
      reason_codes: evaluation.reason_codes,
    },
  });

  const claimTypes = claimTypesFromEvaluation(evaluation.claims);
  const evaluatedClaimRefs = buildEvaluatedClaimRefs(
    claims,
    claimTypes.length ? claimTypes : Object.keys(evaluation.claims),
  );

  const receipt = await issueReceiptForDecision({
    decisionId: decisionRow?.id as string,
    consentReceiptId: consent?.id as string,
    partnerId,
    policyId: policy.id,
    policyVersion: policy.version,
    subjectId: subject,
    decisionResult: evaluation.decision,
    reasonCodes: evaluation.reason_codes,
    claimsJson: evaluation.claims,
    evaluatedClaimRefs,
    expiresAt: evaluation.valid_until,
    decisionContext: isSandboxPolicyId(policy.id) || evaluation.decision_context === "sandbox_only"
      ? "sandbox_only"
      : "production",
  });

  if (!receipt) {
    throw new Error("Failed to issue decision receipt");
  }

  return {
    decision_id: decisionRow?.id as string,
    receipt_id: receipt.id,
    decision: evaluation.decision,
    claims: evaluation.claims,
    reason_codes: evaluation.reason_codes,
    valid_until: evaluation.valid_until,
  };
}

async function getExistingConsentDecision(
  requestId: string,
  subject: string,
): Promise<{
  decision_id: string;
  receipt_id: string | null;
  decision: string;
  claims: Record<string, unknown>;
  reason_codes: string[];
  valid_until: string | null;
}> {
  const sb = requireSupabaseAdmin();
  const { data: decisionRow } = await sb
    .from("verification_decisions")
    .select("*")
    .eq("request_id", requestId)
    .eq("subject_id", subject)
    .order("decided_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!decisionRow) throw new Error("Request already decided");

  const { getReceiptByDecisionId } = await import("@/lib/decisionReceipts/service");
  const receipt = await getReceiptByDecisionId(decisionRow.id as string);

  return {
    decision_id: decisionRow.id as string,
    receipt_id: receipt?.id ?? null,
    decision: decisionRow.decision as string,
    claims: (decisionRow.claims_json as Record<string, unknown>) ?? {},
    reason_codes: (decisionRow.reason_codes as string[]) ?? [],
    valid_until: (decisionRow.valid_until as string | null) ?? null,
  };
}

/** Holder declines — no claims shared, request cancelled */
export async function declineVerificationRequest(input: {
  requestId: string;
  suiAddress: string;
}): Promise<{ status: "cancelled" }> {
  const sb = requireSupabaseAdmin();
  const subject = normalizeSuiAddress(input.suiAddress);

  const { data: request } = await sb
    .from("verification_requests")
    .select("*")
    .eq("id", input.requestId)
    .maybeSingle();

  if (!request) throw new Error("Request not found");
  if (request.status === "decided") throw new Error("Request already decided");
  if (request.status === "cancelled") return { status: "cancelled" };
  if (new Date(request.expires_at as string) < new Date()) {
    await sb.from("verification_requests").update({ status: "expired" }).eq("id", input.requestId);
    throw new Error("Request expired");
  }

  if (request.sui_address && normalizeSuiAddress(request.sui_address as string) !== subject) {
    throw new Error("This request is for a different Passport");
  }

  await sb.from("verification_requests").update({
    status: "cancelled",
    subject_id: subject,
    sui_address: subject,
  }).eq("id", input.requestId);

  await appendAuditEvent({
    actor_type: "subject",
    actor_id: subject,
    action: "verification_request.declined",
    object_type: "verification_request",
    object_id: input.requestId,
    policy_id: request.policy_id as string,
    metadata: { partner_id: request.partner_id },
  });

  return { status: "cancelled" };
}

function mapDecisionRow(row: Record<string, unknown>): PolicyDecisionRecord {
  return {
    id: row.id as string,
    request_id: (row.request_id as string | null) ?? null,
    partner_id: row.partner_id as string,
    subject_id: row.subject_id as string,
    policy_id: row.policy_id as string,
    policy_version: row.policy_version as number,
    decision: row.decision as PolicyDecisionRecord["decision"],
    claims_json: (row.claims_json as Record<string, unknown>) ?? {},
    reason_codes: (row.reason_codes as string[]) ?? [],
    valid_until: (row.valid_until as string | null) ?? null,
    decided_at: row.decided_at as string,
    status: row.status as string,
  };
}

export async function getDecisionStatus(decisionId: string): Promise<PolicyDecisionRecord | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("verification_decisions")
    .select("*")
    .eq("id", decisionId)
    .maybeSingle();

  if (!data) return null;

  const row = data as Record<string, unknown>;
  const mapped = mapDecisionRow(row);

  if (mapped.status !== "active") {
    return mapped;
  }

  if (mapped.valid_until && new Date(mapped.valid_until) < new Date()) {
    await sb.from("verification_decisions")
      .update({ status: "superseded" })
      .eq("id", decisionId);
    return { ...mapped, status: "superseded", decision: "denied" };
  }

  const { evaluation } = await evaluatePolicyForSubject({
    suiAddress: mapped.subject_id,
    policyId: mapped.policy_id,
    partnerId: mapped.partner_id,
  });

  if (evaluation.decision === "denied") {
      await sb.from("verification_decisions")
        .update({ status: "revoked", reason_codes: evaluation.reason_codes })
        .eq("id", decisionId);
      return {
        ...mapped,
        status: "revoked",
        decision: "denied",
        reason_codes: evaluation.reason_codes,
      };
    }

  return mapped;
}

/** Direct policy check — uses issuer trust context when partnerId provided. */
export async function evaluateSubjectPolicy(
  suiAddress: string,
  policyId: string,
  partnerId?: string,
): Promise<ReturnType<typeof evaluatePolicyRules> & { policy_id: string; policy_version: number }> {
  const policy = await getPartnerPolicy(policyId);
  if (!policy) throw new Error("Policy not found");
  const effectivePartnerId = partnerId ?? policy.partner_id;
  const { evaluation, policy: resolved } = await evaluatePolicyForSubject({
    suiAddress,
    policyId,
    partnerId: effectivePartnerId,
  });
  return { ...evaluation, policy_id: resolved.id, policy_version: resolved.version };
}
