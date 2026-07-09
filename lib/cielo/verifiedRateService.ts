// FILE: lib/cielo/verifiedRateService.ts
// Consent, eligibility decisions, verified-rate requests, and public registry events for Cielo.

import { randomUUID } from "crypto";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { appendAuditEvent } from "@/lib/verification/audit";
import { getActiveClaims } from "@/lib/credentials/claimsService";
import { isSandboxClaim } from "@/lib/credentials/sandboxClaims";
import { isSandboxPolicyId } from "@/lib/partner/sandboxPartner";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { getPolicy } from "@/lib/verification/requestsService";
import {
  recordRequestReceivedEvent,
  getVerifiedRateRequestByRef,
} from "@/lib/cielo/verifiedRateOperator";
import {
  USER_STATUS_LABELS,
  VERIFIED_RATE_DISCLAIMER,
  type VerifiedRateOperatorStatus,
} from "@/lib/cielo/verifiedRateLabels";
import {
  CIELO_PARTNER_ID,
  CIELO_RECORD_ID,
  CIELO_VERIFIED_GUEST_POLICY_ID,
  evaluateCieloVerifiedGuest,
  type CieloEligibilityDecision,
} from "@/lib/cielo/verifiedGuestPolicy";
import {
  buildEvaluatedClaimRefs,
  claimTypesFromEvaluation,
} from "@/lib/decisionReceipts/claimRefs";
import { issueReceiptForDecision } from "@/lib/decisionReceipts/service";

export interface VerifiedRateConsentResult {
  consent_receipt_id: string;
  verification_decision_id: string;
  receipt_id: string | null;
  decision: CieloEligibilityDecision;
  display_decision: string;
  reason_codes: string[];
  policy_id: string;
  policy_version: number;
}

export interface VerifiedRateSubmitInput {
  suiAddress: string;
  decisionId: string;
  consentReceiptId: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  guestName?: string;
  contactEmail?: string;
  notes?: string;
}

export interface VerifiedRateSubmitResult {
  public_reference: string;
  status: string;
  eligibility_decision: CieloEligibilityDecision;
}

function publicReference(): string {
  return `CVR-${randomUUID().slice(0, 8).toUpperCase()}`;
}

async function assertProductionEligibleDecision(input: {
  subject: string;
  policyId: string;
  decisionId: string;
}): Promise<void> {
  if (isSandboxPolicyId(input.policyId)) {
    throw new Error("Sandbox policy eligibility cannot submit a verified-rate request");
  }

  const policy = await getPolicy(input.policyId);
  if (policy?.rules_json.sandbox_only) {
    throw new Error("Sandbox-only policy decisions cannot submit verified-rate requests");
  }

  const claims = await getActiveClaims(input.subject);
  const evalResult = evaluatePolicyRules(policy?.rules_json ?? {}, claims);
  if (evalResult.production_usable === false || evalResult.decision_context === "sandbox_only") {
    throw new Error("Sandbox eligibility cannot submit a verified-rate request");
  }

  if (claims.some(c => isSandboxClaim(c))) {
    const hasOnlySandboxScreening = claims
      .filter(c => c.claim_type === "screening_outcome")
      .every(c => isSandboxClaim(c));
    if (hasOnlySandboxScreening && claims.some(c => c.claim_type === "screening_outcome")) {
      throw new Error("Sandbox screening claims cannot be used for verified-rate requests");
    }
  }

  const sb = requireSupabaseAdmin();
  const { data: decisionRow } = await sb
    .from("verification_decisions")
    .select("claims_json")
    .eq("id", input.decisionId)
    .maybeSingle();

  const claimsJson = (decisionRow?.claims_json ?? {}) as Record<string, unknown>;
  for (const value of Object.values(claimsJson)) {
    if (typeof value === "object" && value !== null) {
      const v = value as Record<string, unknown>;
      const nested = (v.value ?? v) as Record<string, unknown>;
      if (nested.environment === "sandbox" || nested.non_reliance === true) {
        throw new Error("Sandbox credential data cannot submit a verified-rate request");
      }
    }
  }
}

export async function grantCieloVerifiedGuestConsent(
  suiAddress: string,
): Promise<VerifiedRateConsentResult> {
  const sb = requireSupabaseAdmin();
  const subject = normalizeSuiAddress(suiAddress);
  const policy = await getPolicy(CIELO_VERIFIED_GUEST_POLICY_ID);
  if (!policy) throw new Error("Policy not found");

  const preCheck = await evaluateCieloVerifiedGuest(subject, { requireConsent: false });
  if (preCheck.decision === "not_eligible") {
    throw new Error(`Not eligible: ${preCheck.reason_codes.join(", ")}`);
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const requestedClaims = ["wallet_binding_confirmed", "profile_complete", "passport_account"];

  const { data: request, error: reqErr } = await sb.from("verification_requests").insert({
    partner_id: CIELO_PARTNER_ID,
    policy_id: CIELO_VERIFIED_GUEST_POLICY_ID,
    subject_id: subject,
    sui_address: subject,
    requested_action: "cielo_verified_rate",
    requested_claims: requestedClaims,
    status: "pending",
    expires_at: expiresAt,
  }).select("id").single();

  if (reqErr || !request) throw new Error(reqErr?.message ?? "Failed to create verification request");

  const claims = await getActiveClaims(subject);
  const evaluation = evaluatePolicyRules(policy.rules_json, claims);
  const gate = await evaluateCieloVerifiedGuest(subject, { requireConsent: true });

  const finalDecision: CieloEligibilityDecision =
    gate.decision === "not_eligible"
      ? "not_eligible"
      : gate.decision === "manual_review" || evaluation.decision !== "approved"
        ? "manual_review"
        : "approved";

  const { data: consent, error: consentErr } = await sb.from("consent_receipts").insert({
    subject_id: subject,
    partner_id: CIELO_PARTNER_ID,
    request_id: request.id,
    purpose: "cielo_verified_rate",
    claims_authorized: requestedClaims,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }).select("id").single();

  if (consentErr || !consent) throw new Error(consentErr?.message ?? "Failed to record consent");

  const { data: decision, error: decErr } = await sb.from("verification_decisions").insert({
    request_id: request.id,
    partner_id: CIELO_PARTNER_ID,
    subject_id: subject,
    policy_id: policy.id,
    policy_version: policy.version,
    decision: finalDecision === "approved" ? "approved" : finalDecision === "manual_review" ? "manual_review" : "denied",
    claims_json: evaluation.claims,
    reason_codes: gate.reason_codes,
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
  }).select("id").single();

  if (decErr || !decision) throw new Error(decErr?.message ?? "Failed to record decision");

  await sb.from("verification_requests").update({
    status: "decided",
    consent_id: consent.id,
  }).eq("id", request.id);

  await appendAuditEvent({
    actor_type: "subject",
    actor_id: subject,
    action: "cielo.consent_granted",
    object_type: "consent_receipt",
    object_id: consent.id as string,
    policy_id: policy.id,
    policy_version: policy.version,
    metadata: { decision: finalDecision },
  });

  await appendAuditEvent({
    actor_type: "system",
    actor_id: "cielo",
    action: "cielo.policy_evaluated",
    object_type: "verification_decision",
    object_id: decision.id as string,
    policy_id: policy.id,
    policy_version: policy.version,
    metadata: { decision: finalDecision, reason_codes: gate.reason_codes },
  });

  const decisionResult =
    finalDecision === "approved" ? "approved" : finalDecision === "manual_review" ? "manual_review" : "denied";
  const claimTypes = claimTypesFromEvaluation(evaluation.claims);
  const evaluatedClaimRefs = buildEvaluatedClaimRefs(
    claims,
    claimTypes.length ? claimTypes : requestedClaims,
  );

  const receipt = await issueReceiptForDecision({
    decisionId: decision.id as string,
    consentReceiptId: consent.id as string,
    partnerId: CIELO_PARTNER_ID,
    policyId: policy.id,
    policyVersion: policy.version,
    subjectId: subject,
    decisionResult,
    reasonCodes: gate.reason_codes,
    claimsJson: evaluation.claims,
    evaluatedClaimRefs,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    decisionContext: "production",
  });

  return {
    consent_receipt_id: consent.id as string,
    verification_decision_id: decision.id as string,
    receipt_id: receipt?.id ?? null,
    decision: finalDecision,
    display_decision: gate.display_decision,
    reason_codes: gate.reason_codes,
    policy_id: policy.id,
    policy_version: policy.version,
  };
}

export async function submitVerifiedRateRequest(
  input: VerifiedRateSubmitInput,
): Promise<VerifiedRateSubmitResult> {
  const sb = requireSupabaseAdmin();
  const subject = normalizeSuiAddress(input.suiAddress);

  const { data: decisionRow } = await sb
    .from("verification_decisions")
    .select("id, decision, subject_id, policy_id, policy_version, status")
    .eq("id", input.decisionId)
    .maybeSingle();

  if (!decisionRow || decisionRow.subject_id !== subject) {
    throw new Error("Invalid or expired eligibility decision");
  }

  if (decisionRow.status !== "active") {
    throw new Error("Eligibility decision is no longer active");
  }

  await assertProductionEligibleDecision({
    subject,
    policyId: decisionRow.policy_id as string,
    decisionId: input.decisionId,
  });

  const mappedDecision: CieloEligibilityDecision =
    decisionRow.decision === "approved"
      ? "approved"
      : decisionRow.decision === "manual_review"
        ? "manual_review"
        : "not_eligible";

  if (mappedDecision !== "approved") {
    throw new Error("Only approved eligibility can submit a verified-rate request");
  }

  const gate = await evaluateCieloVerifiedGuest(subject, { requireConsent: true });
  if (gate.decision !== "approved") {
    throw new Error("Eligibility changed — re-run policy check");
  }

  const ref = publicReference();
  const status = "request_received";

  const { data: inserted, error } = await sb.from("cielo_verified_rate_requests").insert({
    public_reference: ref,
    subject_sui_address: subject,
    wallet_binding_id: gate.wallet_binding_id,
    cielo_record_id: CIELO_RECORD_ID,
    policy_id: decisionRow.policy_id as string,
    policy_version: decisionRow.policy_version as number,
    verification_decision_id: input.decisionId,
    consent_receipt_id: input.consentReceiptId,
    check_in: input.checkIn ?? null,
    check_out: input.checkOut ?? null,
    guests: input.guests ?? null,
    guest_name: input.guestName ?? null,
    contact_email: input.contactEmail ?? null,
    notes: input.notes ?? null,
    eligibility_decision: mappedDecision,
    status,
    reason_codes: gate.reason_codes,
    updated_at: new Date().toISOString(),
  }).select("id").single();

  if (error || !inserted) throw new Error(error?.message ?? "Insert failed");

  await recordRequestReceivedEvent({
    requestId: inserted.id as string,
    publicReference: ref,
    subjectId: subject,
  });

  await sb.from("cielo_registry_public_events").insert({
    record_id: CIELO_RECORD_ID,
    event_type: "verified_rate_request",
    message: "Verified-rate request recorded",
  });

  await appendAuditEvent({
    actor_type: "subject",
    actor_id: subject,
    action: "cielo.verified_rate_request_created",
    object_type: "cielo_verified_rate_request",
    object_id: ref,
    policy_id: decisionRow.policy_id as string,
    policy_version: decisionRow.policy_version as number,
    metadata: { public_reference: ref, status },
  });

  return {
    public_reference: ref,
    status,
    eligibility_decision: mappedDecision,
  };
}

export async function getPublicRegistryEvents(recordId: string, limit = 5) {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("cielo_registry_public_events")
    .select("event_type, message, created_at")
    .eq("record_id", recordId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getVerifiedRateRequestForSubject(
  publicReference: string,
  suiAddress: string,
) {
  const row = await getVerifiedRateRequestByRef(publicReference);
  if (!row) return null;

  const subject = normalizeSuiAddress(suiAddress);
  if (row.subject_sui_address !== subject) {
    throw new Error("Forbidden");
  }

  const status = row.status as VerifiedRateOperatorStatus;

  return {
    public_reference: row.public_reference,
    status,
    status_label: USER_STATUS_LABELS[status] ?? row.status,
    eligibility_decision: row.eligibility_decision,
    disclaimer: VERIFIED_RATE_DISCLAIMER,
    check_in: row.check_in,
    check_out: row.check_out,
    guests: row.guests,
    created_at: row.created_at,
    updated_at: row.updated_at,
    timeline: row.events.map(e => ({
      status: e.next_status,
      status_label: USER_STATUS_LABELS[e.next_status as VerifiedRateOperatorStatus] ?? e.next_status,
      action: e.action,
      at: e.created_at,
    })),
  };
}

/** @deprecated Use listVerifiedRateRequests from verifiedRateOperator */
export async function listVerifiedRateRequestsForAdmin(limit = 50) {
  const { listVerifiedRateRequests } = await import("@/lib/cielo/verifiedRateOperator");
  return listVerifiedRateRequests({ limit });
}
