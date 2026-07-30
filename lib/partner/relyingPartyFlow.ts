// FILE: lib/partner/relyingPartyFlow.ts
// Generic relying-party flow: credential-first verify, Passport only when required.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { getActiveClaims } from "@/lib/credentials/claimsService";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { loadPolicyTrustContext } from "@/lib/trust/loadPolicyTrustContext";
import { resolveClaimStatusAtRead } from "@/lib/trust/credentialStatusRegistry";
import { buildEvaluatedClaimRefs, claimTypesFromEvaluation } from "@/lib/decisionReceipts/claimRefs";
import { issueReceiptForDecision } from "@/lib/decisionReceipts/service";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { appendAuditEvent } from "@/lib/verification/audit";
import { createVerificationRequest, getPolicy } from "@/lib/verification/requestsService";
import { isReturnUrlAllowed, buildRedirectUrl } from "@/lib/connect/returnUrlAllowlist";
import { computeSessionReceiptExpiresAt } from "@/lib/partner/sessionReceipt";
import { buildPartnerVerificationResult } from "@/lib/partner/partnerVerificationResult";
import type { PartnerVerificationResult } from "@/lib/partner/partnerVerificationResult";
import type { PartnerPolicyRules } from "@/lib/policy/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://abraxas-app.vercel.app";
const ISSUER = process.env.ABRAXAS_ISSUER_URL ?? APP_URL;

export type PartnerFlowNextStep =
  | "authenticate"
  | "passport"
  | "enter"
  | "denied"
  | "pending_review";

export interface HolderCredentialStatus {
  status: "none" | "pending_review" | "active" | "expired" | "revoked";
  credential_jti?: string;
  credential_jwt?: string;
  assurance_level?: string | null;
}

export interface PartnerFlowEvaluateResult {
  next: PartnerFlowNextStep;
  redirect_url?: string;
  verification_request_id?: string;
  passport_url?: string;
  partner_result?: PartnerVerificationResult;
  reason_codes?: string[];
}

export interface PartnerFlowStartInput {
  partnerId: string;
  policyId: string;
  returnUrl: string;
  suiAddress?: string;
}

export function buildPassportUrl(input: {
  verificationRequestId: string;
  partnerId: string;
  policyId: string;
  returnUrl: string;
}): string {
  const params = new URLSearchParams({
    verify_request: input.verificationRequestId,
    partner_id: input.partnerId,
    policy_id: input.policyId,
    return: input.returnUrl,
  });
  return `${APP_URL}/passport?${params.toString()}`;
}

export function buildPartnerVerifyUrl(input: {
  partnerId: string;
  policyId: string;
  returnUrl: string;
}): string {
  const params = new URLSearchParams({
    partner_id: input.partnerId,
    policy_id: input.policyId,
    return_url: input.returnUrl,
  });
  return `${APP_URL}/partner/verify?${params.toString()}`;
}

export async function getHolderCredentialStatus(suiAddress: string): Promise<HolderCredentialStatus> {
  const sb = requireSupabaseAdmin();
  const subject = normalizeSuiAddress(suiAddress);

  const { data: verification } = await sb
    .from("identity_verifications")
    .select("status, credential_jti")
    .or(`wallet_address.eq.${subject},sui_address.eq.${subject}`)
    .maybeSingle();

  if (!verification) return { status: "none" };

  if (verification.status === "pending" || verification.status === "in_progress") {
    return { status: "pending_review" };
  }

  if (verification.status !== "approved" || !verification.credential_jti) {
    return { status: "none" };
  }

  const { data: cred } = await sb
    .from("abraxas_credentials")
    .select("jti, credential_jwt, expiration_date, revoked_at")
    .eq("jti", verification.credential_jti)
    .maybeSingle();

  if (!cred) return { status: "none" };
  if (cred.revoked_at) return { status: "revoked", credential_jti: cred.jti as string };
  if (new Date(cred.expiration_date as string) < new Date()) {
    return { status: "expired", credential_jti: cred.jti as string };
  }

  return {
    status: "active",
    credential_jti: cred.jti as string,
    credential_jwt: cred.credential_jwt as string,
    assurance_level: "L2",
  };
}

async function evaluateHolderPolicy(
  suiAddress: string,
  partnerId: string,
  policyId: string,
) {
  const policy = await getPolicy(policyId);
  if (!policy) throw new Error("Policy not found");
  if (policy.partner_id !== partnerId) throw new Error("Policy does not belong to partner");

  const claims = await getActiveClaims(suiAddress);
  const residency = claims.find(c => c.claim_type === "residency_country")?.claim_value?.country as string | undefined;
  const trustContext = await loadPolicyTrustContext({
    partnerId,
    policyId: policy.id,
    jurisdiction: residency ?? claims.find(c => c.jurisdiction)?.jurisdiction,
  });

  const evaluation = evaluatePolicyRules(policy.rules_json, claims, {
    jurisdiction: trustContext.jurisdiction,
    partnerId,
    policyId: policy.id,
    trustRulesByClaimType: trustContext.trustRulesByClaimType,
  });

  return { policy, evaluation, claims };
}

export async function issuePartnerSessionReceipt(input: {
  suiAddress: string;
  partnerId: string;
  policyId: string;
  credentialJti: string;
  verificationRequestId?: string;
}): Promise<{ decision_id: string; receipt_id: string; receipt_expires_at: string; partner_result: PartnerVerificationResult }> {
  const sb = requireSupabaseAdmin();
  const subject = normalizeSuiAddress(input.suiAddress);
  const { policy, evaluation } = await evaluateHolderPolicy(subject, input.partnerId, input.policyId);
  const sessionExpires = computeSessionReceiptExpiresAt(policy.rules_json);
  const evaluatedAt = new Date().toISOString();

  const { data: decisionRow } = await sb.from("verification_decisions").insert({
    request_id: input.verificationRequestId ?? null,
    partner_id: input.partnerId,
    subject_id: subject,
    policy_id: policy.id,
    policy_version: policy.version,
    decision: evaluation.decision,
    claims_json: evaluation.claims,
    reason_codes: evaluation.reason_codes,
    valid_until: sessionExpires,
  }).select("id").single();

  const decisionId = decisionRow?.id as string;
  const claimRefs = buildEvaluatedClaimRefs(
    await getActiveClaims(subject),
    claimTypesFromEvaluation(evaluation.claims),
  );

  const receipt = await issueReceiptForDecision({
    decisionId,
    partnerId: input.partnerId,
    policyId: policy.id,
    policyVersion: policy.version,
    subjectId: subject,
    decisionResult: evaluation.decision === "approved" ? "approved" : evaluation.decision === "manual_review" ? "manual_review" : "denied",
    reasonCodes: evaluation.reason_codes,
    claimsJson: evaluation.claims,
    evaluatedClaimRefs: claimRefs,
    expiresAt: sessionExpires,
    decisionContext: policy.rules_json.sandbox_only ? "sandbox_only" : "production",
  });

  if (!receipt) throw new Error("Failed to issue session receipt");

  const identityVerified = Boolean(evaluation.claims.identity_verified);

  const partner_result = buildPartnerVerificationResult({
    decision: evaluation.decision === "approved" ? "approved" : evaluation.decision === "manual_review" ? "manual_review" : "denied",
    credentialJti: input.credentialJti,
    issuer: ISSUER,
    evaluatedAt,
    receiptId: receipt.id,
    receiptExpiresAt: sessionExpires,
    policyId: policy.id,
    partnerId: input.partnerId,
    identityVerified,
    minimumAge: policy.rules_json.minimum_age,
    assuranceLevel: identityVerified ? "L2" : null,
    reasonCodes: evaluation.reason_codes,
  });

  await appendAuditEvent({
    actor_type: "system",
    actor_id: "partner_flow",
    action: "partner_session.receipt_issued",
    object_type: "decision_receipt",
    object_id: receipt.id,
    policy_id: policy.id,
    metadata: { partner_id: input.partnerId, credential_jti: input.credentialJti },
  });

  return {
    decision_id: decisionId,
    receipt_id: receipt.id,
    receipt_expires_at: sessionExpires,
    partner_result,
  };
}

export async function startPartnerFlow(input: PartnerFlowStartInput): Promise<{
  partner_verify_url: string;
  verification_request_id?: string;
}> {
  if (!await isReturnUrlAllowed(input.partnerId, input.returnUrl)) {
    throw new Error("return_url not allowlisted for partner");
  }

  const partnerVerifyUrl = buildPartnerVerifyUrl({
    partnerId: input.partnerId,
    policyId: input.policyId,
    returnUrl: input.returnUrl,
  });

  return { partner_verify_url: partnerVerifyUrl };
}

export async function evaluatePartnerFlow(input: {
  suiAddress?: string | null;
  partnerId: string;
  policyId: string;
  returnUrl: string;
}): Promise<PartnerFlowEvaluateResult> {
  if (!await isReturnUrlAllowed(input.partnerId, input.returnUrl)) {
    throw new Error("return_url not allowlisted for partner");
  }

  if (!input.suiAddress) {
    return { next: "authenticate" };
  }

  const subject = normalizeSuiAddress(input.suiAddress);
  const credential = await getHolderCredentialStatus(subject);

  if (credential.status === "pending_review") {
    return { next: "pending_review" };
  }

  if (credential.status === "active" && credential.credential_jti) {
    const { evaluation } = await evaluateHolderPolicy(subject, input.partnerId, input.policyId);

    if (evaluation.decision === "approved") {
      const { decision_id, receipt_id, receipt_expires_at, partner_result } = await issuePartnerSessionReceipt({
        suiAddress: subject,
        partnerId: input.partnerId,
        policyId: input.policyId,
        credentialJti: credential.credential_jti,
      });

      const redirect_url = buildRedirectUrl(input.returnUrl, {
        status: "approved",
        decision_id,
        receipt_id,
        receipt_expires_at,
        credential_id: credential.credential_jti,
        policy_id: input.policyId,
        partner_id: input.partnerId,
      });

      return {
        next: "enter",
        redirect_url,
        partner_result: { ...partner_result, receipt_id, receipt_expires_at },
      };
    }

    if (evaluation.decision === "manual_review") {
      return { next: "pending_review", reason_codes: evaluation.reason_codes };
    }

    return { next: "denied", reason_codes: evaluation.reason_codes };
  }

  // No credential, expired, or revoked → Passport
  const request = await createVerificationRequest({
    partnerId: input.partnerId,
    policyId: input.policyId,
    requestedAction: (await getPolicy(input.policyId))?.rules_json.product_eligibility_action ?? "partner_eligibility",
    suiAddress: subject,
    returnUrl: input.returnUrl,
  });

  const passport_url = buildPassportUrl({
    verificationRequestId: request.request_id,
    partnerId: input.partnerId,
    policyId: input.policyId,
    returnUrl: input.returnUrl,
  });

  return {
    next: credential.status === "expired" || credential.status === "revoked" ? "passport" : "passport",
    verification_request_id: request.request_id,
    passport_url,
  };
}

export async function completePartnerFlowAfterApproval(input: {
  suiAddress: string;
  partnerId: string;
  policyId: string;
  returnUrl: string;
  verificationRequestId?: string;
}): Promise<PartnerFlowEvaluateResult & { ok: true } | { ok: false; error: string }> {
  if (!await isReturnUrlAllowed(input.partnerId, input.returnUrl)) {
    return { ok: false, error: "return_url not allowlisted for partner" };
  }

  const credential = await getHolderCredentialStatus(input.suiAddress);
  if (credential.status !== "active" || !credential.credential_jti) {
    return { ok: false, error: "Credential not yet active" };
  }

  const { decision_id, partner_result, receipt_id, receipt_expires_at } = await issuePartnerSessionReceipt({
    suiAddress: input.suiAddress,
    partnerId: input.partnerId,
    policyId: input.policyId,
    credentialJti: credential.credential_jti,
    verificationRequestId: input.verificationRequestId,
  });

  const redirect_url = buildRedirectUrl(input.returnUrl, {
    status: partner_result.decision,
    decision_id,
    receipt_id,
    receipt_expires_at,
    credential_id: credential.credential_jti,
    policy_id: input.policyId,
    partner_id: input.partnerId,
  });

  return {
    ok: true,
    next: partner_result.decision === "approved" ? "enter" : "denied",
    redirect_url,
    partner_result,
  };
}

/** Re-issue session receipt when prior receipt expired but credential remains valid. */
export async function refreshPartnerSessionReceipt(input: {
  suiAddress: string;
  partnerId: string;
  policyId: string;
  returnUrl: string;
}): Promise<PartnerFlowEvaluateResult> {
  const credential = await getHolderCredentialStatus(input.suiAddress);
  if (credential.status !== "active" || !credential.credential_jti) {
    return { next: "passport" };
  }

  const { evaluation } = await evaluateHolderPolicy(input.suiAddress, input.partnerId, input.policyId);
  if (evaluation.decision !== "approved") {
    return { next: "denied", reason_codes: evaluation.reason_codes };
  }

  const { decision_id, receipt_id, receipt_expires_at, partner_result } = await issuePartnerSessionReceipt({
    suiAddress: input.suiAddress,
    partnerId: input.partnerId,
    policyId: input.policyId,
    credentialJti: credential.credential_jti,
  });

  const redirect_url = buildRedirectUrl(input.returnUrl, {
    status: "approved",
    decision_id,
    receipt_id,
    receipt_expires_at,
    credential_id: credential.credential_jti,
    policy_id: input.policyId,
    partner_id: input.partnerId,
  });

  return {
    next: "enter",
    redirect_url,
    partner_result: { ...partner_result, receipt_id, receipt_expires_at },
  };
}

export { isReturnUrlAllowed as isAllowedPartnerReturnUrl } from "@/lib/connect/returnUrlAllowlist";

/** Pure helper for tests — maps credential + policy evaluation to next step. */
export function resolvePartnerFlowStep(input: {
  credentialStatus: HolderCredentialStatus["status"];
  policyDecision: "approved" | "denied" | "manual_review";
  authenticated: boolean;
}): PartnerFlowNextStep {
  if (!input.authenticated) return "authenticate";
  if (input.credentialStatus === "pending_review") return "pending_review";
  if (input.credentialStatus === "active" && input.policyDecision === "approved") return "enter";
  if (input.credentialStatus === "active" && input.policyDecision === "denied") return "denied";
  if (input.credentialStatus === "active" && input.policyDecision === "manual_review") return "pending_review";
  return "passport";
}
