// FILE: lib/cielo/verifiedRateService.ts
// Consent, decisions, booking requests, and public registry events for Cielo verified rate.

import { randomUUID } from "crypto";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { appendAuditEvent } from "@/lib/verification/audit";
import { getActiveClaims } from "@/lib/credentials/claimsService";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { getPolicy } from "@/lib/verification/requestsService";
import {
  CIELO_PARTNER_ID,
  CIELO_RECORD_ID,
  CIELO_VERIFIED_GUEST_POLICY_ID,
  evaluateCieloVerifiedGuest,
  type CieloEligibilityDecision,
} from "@/lib/cielo/verifiedGuestPolicy";

export interface VerifiedRateConsentResult {
  consent_receipt_id: string;
  verification_decision_id: string;
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

  return {
    consent_receipt_id: consent.id as string,
    verification_decision_id: decision.id as string,
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

  const { error } = await sb.from("cielo_verified_rate_requests").insert({
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
  });

  if (error) throw new Error(error.message);

  await sb.from("cielo_registry_public_events").insert({
    record_id: CIELO_RECORD_ID,
    event_type: "verified_rate_request",
    message: "Verified booking eligibility event recorded",
  });

  await appendAuditEvent({
    actor_type: "subject",
    actor_id: subject,
    action: "cielo.booking_request_created",
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

export async function listVerifiedRateRequestsForAdmin(limit = 50) {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("cielo_verified_rate_requests")
    .select(`
      public_reference, status, eligibility_decision, check_in, check_out, guests,
      guest_name, contact_email, policy_id, policy_version, verification_decision_id,
      consent_receipt_id, reason_codes, created_at, updated_at
    `)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
