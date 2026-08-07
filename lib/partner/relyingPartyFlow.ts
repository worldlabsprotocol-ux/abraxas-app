// FILE: lib/partner/relyingPartyFlow.ts
// Generic relying-party flow: credential-first verify, Passport only when required.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { getActiveClaims } from "@/lib/credentials/claimsService";
import { evaluatePolicyForSubject } from "@/lib/policy/evaluateSubjectPolicy";
import { findActiveSessionDecision, findDecisionByVerificationRequest, findDecisionByIdempotencyKey, findSessionReceiptForSupersede, supersedeActiveSessionDecisions } from "@/lib/partner/sessionDecision";
import {
  isMissingIdempotencyKeyColumnError,
  isVerificationDecisionIdempotencyKeyAvailable,
  markVerificationDecisionIdempotencyKeyAbsent,
} from "@/lib/partner/verificationDecisionsSchema";
import {
  assertIdempotentPartnerFlowIdentity,
  PartnerFlowIdempotencyConflictError,
  resolvePartnerFlowIdempotencyKey,
  type PartnerFlowReplayStatus,
} from "@/lib/partner/partnerFlowIdempotency";
import { evaluateDecisionReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import { getReceiptByDecisionId } from "@/lib/decisionReceipts/service";
import { resolveClaimStatusAtRead } from "@/lib/trust/credentialStatusRegistry";
import { buildEvaluatedClaimRefs, claimTypesFromEvaluation } from "@/lib/decisionReceipts/claimRefs";
import { issueReceiptForDecision } from "@/lib/decisionReceipts/service";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { createVerificationRequest, getPolicy } from "@/lib/verification/requestsService";
import { getPublicAppOrigin } from "@/lib/app/publicAppOrigin";
import { isReturnUrlAllowed, buildRedirectUrl } from "@/lib/connect/returnUrlAllowlist";
import { computeSessionReceiptExpiresAt } from "@/lib/partner/sessionReceipt";
import { buildPartnerVerificationResult } from "@/lib/partner/partnerVerificationResult";
import type { PartnerVerificationResult } from "@/lib/partner/partnerVerificationResult";
import {
  partnerFlowReceiptAccessBlocked,
  partnerFlowRevocationDeniedFields,
} from "@/lib/partner/partnerFlowReceiptAccess";
import type { PartnerPolicyRules } from "@/lib/policy/types";

const APP_URL = getPublicAppOrigin();
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
  /** P1-2 additive — idempotent replay vs fresh issue. */
  replay_status?: "issued" | "idempotent_replay";
  /** P1-2 additive — authoritative trust evaluation for partner_result receipt. */
  currently_valid?: boolean;
  validity?: string;
  invalidation_reasons?: string[];
  /** P1-3 additive — audit correlation fields. */
  decision_id?: string;
  policy_version?: number;
  /** P1-3 additive — prior receipt superseded by a refresh replacement issuance. */
  replaced_receipt_id?: string | null;
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
  appOrigin?: string;
}): string {
  const appUrl = (input.appOrigin ?? getPublicAppOrigin()).replace(/\/$/, "");
  const params = new URLSearchParams({
    verify_request: input.verificationRequestId,
    partner_id: input.partnerId,
    policy_id: input.policyId,
    return: input.returnUrl,
  });
  return `${appUrl}/passport?${params.toString()}`;
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
  return evaluatePolicyForSubject({ suiAddress, policyId, partnerId });
}

export async function issuePartnerSessionReceipt(input: {
  suiAddress: string;
  partnerId: string;
  policyId: string;
  credentialJti: string;
  verificationRequestId?: string;
  /** When true, supersede prior session decisions before issuing (refresh after TTL). */
  supersedePriorSession?: boolean;
}): Promise<{
  decision_id: string;
  receipt_id: string;
  receipt_expires_at: string;
  partner_result: PartnerVerificationResult;
  replay_status: PartnerFlowReplayStatus;
  currently_valid: boolean;
  validity: string;
  invalidation_reasons: string[];
  replaced_receipt_id?: string | null;
}> {
  const subject = normalizeSuiAddress(input.suiAddress);
  const idempotencyKey = resolvePartnerFlowIdempotencyKey({
    partnerId: input.partnerId,
    subjectId: subject,
    policyId: input.policyId,
    verificationRequestId: input.verificationRequestId,
  });

  const identity = {
    partnerId: input.partnerId,
    subjectId: subject,
    policyId: input.policyId,
    verificationRequestId: input.verificationRequestId,
  };

  let replay_status: PartnerFlowReplayStatus = "idempotent_replay";
  let decisionId: string | undefined;
  let receiptId: string | undefined;
  let receiptExpiresAt: string | undefined;
  let replacedReceiptId: string | null = null;

  const vrId = input.verificationRequestId?.trim();
  if (vrId) {
    const byVr = await findDecisionByVerificationRequest({
      verificationRequestId: vrId,
      subjectId: subject,
    });
    if (byVr) {
      decisionId = byVr.decision_id;
      receiptId = byVr.receipt_id;
      receiptExpiresAt = byVr.receipt_expires_at;
    }
  }

  if (!decisionId) {
    const byKey = await findDecisionByIdempotencyKey(idempotencyKey);
    if (byKey) {
      assertIdempotentPartnerFlowIdentity(byKey, identity);
      const receipt = await getReceiptByDecisionId(byKey.decision_id);
      if (!receipt) throw new Error("Stored decision missing receipt");
      decisionId = byKey.decision_id;
      receiptId = receipt.id;
      receiptExpiresAt = byKey.valid_until ?? receipt.expires_at ?? new Date().toISOString();
    }
  }

  if (!decisionId) {
    const existing = await findActiveSessionDecision({
      partnerId: input.partnerId,
      subjectId: subject,
      policyId: input.policyId,
    });
    if (existing) {
      decisionId = existing.decision_id;
      receiptId = existing.receipt_id;
      receiptExpiresAt = existing.receipt_expires_at;
    }
  }

  if (!decisionId) {
    replay_status = "issued";
    if (input.supersedePriorSession) {
      replacedReceiptId = await findSessionReceiptForSupersede({
        partnerId: input.partnerId,
        subjectId: subject,
        policyId: input.policyId,
      });
      await supersedeActiveSessionDecisions({
        partnerId: input.partnerId,
        subjectId: subject,
        policyId: input.policyId,
      });
    }

    const sb = requireSupabaseAdmin();
    const { policy, evaluation } = await evaluateHolderPolicy(subject, input.partnerId, input.policyId);
    const sessionExpires = computeSessionReceiptExpiresAt(policy.rules_json);

    const decisionInsertBase = {
      request_id: input.verificationRequestId ?? null,
      partner_id: input.partnerId,
      subject_id: subject,
      policy_id: policy.id,
      policy_version: policy.version,
      decision: evaluation.decision,
      claims_json: evaluation.claims,
      reason_codes: evaluation.reason_codes,
      valid_until: sessionExpires,
    };

    const idempotencyKeyAvailable = await isVerificationDecisionIdempotencyKeyAvailable();
    let decisionInsertRow: typeof decisionInsertBase & { idempotency_key?: string } = decisionInsertBase;
    if (idempotencyKeyAvailable) {
      decisionInsertRow = { ...decisionInsertBase, idempotency_key: idempotencyKey };
    }

    let { data: decisionRow, error: insertError } = await sb
      .from("verification_decisions")
      .insert(decisionInsertRow)
      .select("id")
      .single();

    if (insertError && idempotencyKeyAvailable && isMissingIdempotencyKeyColumnError(insertError)) {
      markVerificationDecisionIdempotencyKeyAbsent();
      ({ data: decisionRow, error: insertError } = await sb
        .from("verification_decisions")
        .insert(decisionInsertBase)
        .select("id")
        .single());
    }

    if (insertError?.code === "23505" && idempotencyKeyAvailable) {
      const raced = await findDecisionByIdempotencyKey(idempotencyKey);
      if (!raced) throw new Error(insertError.message);
      assertIdempotentPartnerFlowIdentity(raced, identity);
      const receipt = await getReceiptByDecisionId(raced.decision_id);
      if (!receipt) throw new Error("Raced decision missing receipt");
      decisionId = raced.decision_id;
      receiptId = receipt.id;
      receiptExpiresAt = raced.valid_until ?? receipt.expires_at ?? sessionExpires;
      replay_status = "idempotent_replay";
    } else if (!decisionRow?.id) {
      throw new Error(insertError?.message ?? "Failed to create verification decision");
    } else {
      decisionId = decisionRow.id as string;
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
      receiptId = receipt.id;
      receiptExpiresAt = sessionExpires;
      replay_status = "issued";
    }
  }

  if (!decisionId) {
    throw new Error("Failed to resolve partner session decision");
  }

  const storedReceipt = await getReceiptByDecisionId(decisionId);
  if (!storedReceipt) throw new Error("Receipt not found for decision");
  if (!receiptId || !receiptExpiresAt) {
    throw new Error("Partner session receipt identity incomplete");
  }

  const trust = await evaluateDecisionReceiptTrust(storedReceipt, {
    partnerId: input.partnerId,
    policyId: input.policyId,
  });

  const { policy, evaluation } = await evaluateHolderPolicy(subject, input.partnerId, input.policyId);
  const evaluatedAt = new Date().toISOString();
  const identityVerified = Boolean(evaluation.claims.identity_verified);
  const partner_result = buildPartnerVerificationResult({
    decision: evaluation.decision === "approved" ? "approved" : evaluation.decision === "manual_review" ? "manual_review" : "denied",
    credentialJti: input.credentialJti,
    issuer: ISSUER,
    evaluatedAt,
    receiptId,
    receiptExpiresAt,
    policyId: policy.id,
    partnerId: input.partnerId,
    identityVerified,
    minimumAge: policy.rules_json.minimum_age,
    assuranceLevel: identityVerified ? "L2" : null,
    reasonCodes: evaluation.reason_codes,
  });

  return {
    decision_id: decisionId,
    receipt_id: receiptId,
    receipt_expires_at: receiptExpiresAt,
    partner_result,
    replay_status,
    currently_valid: trust.currently_valid,
    validity: trust.validity,
    invalidation_reasons: trust.invalidation_reasons,
    replaced_receipt_id: replacedReceiptId,
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
  appOrigin?: string;
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
    const { policy, evaluation } = await evaluateHolderPolicy(subject, input.partnerId, input.policyId);

    if (evaluation.decision === "approved") {
      const { decision_id, receipt_id, receipt_expires_at, partner_result, replay_status, currently_valid, validity, invalidation_reasons } = await issuePartnerSessionReceipt({
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

      if (partnerFlowReceiptAccessBlocked({ currently_valid, invalidation_reasons })) {
        return {
          ...partnerFlowRevocationDeniedFields({ currently_valid, validity, invalidation_reasons }),
          policy_version: policy.version,
        };
      }

      return {
        next: "enter",
        redirect_url,
        partner_result: { ...partner_result, receipt_id, receipt_expires_at },
        replay_status,
        currently_valid,
        validity,
        invalidation_reasons,
        decision_id,
        policy_version: policy.version,
      };
    }

    if (evaluation.decision === "manual_review") {
      return { next: "pending_review", reason_codes: evaluation.reason_codes, policy_version: policy.version };
    }

    return { next: "denied", reason_codes: evaluation.reason_codes, policy_version: policy.version };
  }

  // No credential, expired, or revoked → Passport
  const policy = await getPolicy(input.policyId);
  const request = await createVerificationRequest({
    partnerId: input.partnerId,
    policyId: input.policyId,
    requestedAction: (await getPolicy(input.policyId))?.rules_json.product_eligibility_action ?? "partner_eligibility",
    suiAddress: subject,
    returnUrl: input.returnUrl,
    appOrigin: input.appOrigin,
  });

  const passport_url = buildPassportUrl({
    verificationRequestId: request.request_id,
    partnerId: input.partnerId,
    policyId: input.policyId,
    returnUrl: input.returnUrl,
    appOrigin: input.appOrigin,
  });

  return {
    next: credential.status === "expired" || credential.status === "revoked" ? "passport" : "passport",
    verification_request_id: request.request_id,
    passport_url,
    policy_version: policy?.version,
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

  const issued = await issuePartnerSessionReceipt({
    suiAddress: input.suiAddress,
    partnerId: input.partnerId,
    policyId: input.policyId,
    credentialJti: credential.credential_jti,
    verificationRequestId: input.verificationRequestId,
  });

  const { decision_id, partner_result, receipt_id, receipt_expires_at, replay_status, currently_valid, validity, invalidation_reasons } = issued;
  const policy = await getPolicy(input.policyId);

  const redirect_url = buildRedirectUrl(input.returnUrl, {
    status: partner_result.decision,
    decision_id,
    receipt_id,
    receipt_expires_at,
    credential_id: credential.credential_jti,
    policy_id: input.policyId,
    partner_id: input.partnerId,
  });

  if (partnerFlowReceiptAccessBlocked({ currently_valid, invalidation_reasons })) {
    return {
      ok: true,
      ...partnerFlowRevocationDeniedFields({ currently_valid, validity, invalidation_reasons }),
      policy_version: policy?.version,
    };
  }

  return {
    ok: true,
    next: partner_result.decision === "approved" ? "enter" : "denied",
    redirect_url,
    partner_result,
    replay_status,
    currently_valid,
    validity,
    invalidation_reasons,
    decision_id,
    policy_version: policy?.version,
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

  const { policy, evaluation } = await evaluateHolderPolicy(input.suiAddress, input.partnerId, input.policyId);
  if (evaluation.decision !== "approved") {
    return { next: "denied", reason_codes: evaluation.reason_codes, policy_version: policy.version };
  }

  const { decision_id, receipt_id, receipt_expires_at, partner_result, replay_status, currently_valid, validity, invalidation_reasons, replaced_receipt_id } = await issuePartnerSessionReceipt({
    suiAddress: input.suiAddress,
    partnerId: input.partnerId,
    policyId: input.policyId,
    credentialJti: credential.credential_jti,
    supersedePriorSession: true,
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

  if (partnerFlowReceiptAccessBlocked({ currently_valid, invalidation_reasons })) {
    return {
      ...partnerFlowRevocationDeniedFields({ currently_valid, validity, invalidation_reasons }),
      policy_version: policy.version,
    };
  }

  return {
    next: "enter",
    redirect_url,
    partner_result: { ...partner_result, receipt_id, receipt_expires_at },
    replay_status,
    currently_valid,
    validity,
    invalidation_reasons,
    decision_id,
    policy_version: policy.version,
    replaced_receipt_id,
  };
}

export { isReturnUrlAllowed as isAllowedPartnerReturnUrl } from "@/lib/connect/returnUrlAllowlist";
export { PartnerFlowIdempotencyConflictError } from "@/lib/partner/partnerFlowIdempotency";

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
