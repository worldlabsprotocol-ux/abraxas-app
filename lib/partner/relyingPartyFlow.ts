// FILE: lib/partner/relyingPartyFlow.ts
// Generic relying-party flow: credential-first verify, Passport only when required.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { buildPartnerContinuePath } from "@/lib/partner/partnerFlowContinuation";
import { getActiveClaimsForPolicyEvaluation } from "@/lib/credentials/claimsService";
import { evaluatePolicyForSubject } from "@/lib/policy/evaluateSubjectPolicy";
import {
  findActiveSessionDecision,
  findDecisionByVerificationRequest,
  findDecisionByIdempotencyKey,
  findReceiptForVerificationRequest,
  findSessionReceiptForSupersede,
  supersedeActiveSessionDecisions,
} from "@/lib/partner/sessionDecision";
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
import { resolvePartnerFlowReceiptCorrelation } from "@/lib/partner/partnerFlowCompleteCorrelation";
import { evaluateDecisionReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import { getReceiptByDecisionId } from "@/lib/decisionReceipts/service";
import { resolveClaimStatusAtRead } from "@/lib/trust/credentialStatusRegistry";
import { buildEvaluatedClaimRefs, claimTypesFromEvaluation } from "@/lib/decisionReceipts/claimRefs";
import { issueReceiptForDecision } from "@/lib/decisionReceipts/service";
import { resolveReceiptDecisionContext } from "@/lib/partner/launchpad/productionActivation";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { createVerificationRequest, getPolicy } from "@/lib/verification/requestsService";
import { resolveIssuablePolicyForPartner } from "@/lib/policy/changeControl/lifecycle";
import { getPublicAppOrigin } from "@/lib/app/publicAppOrigin";
import { isReturnUrlAllowed, buildRedirectUrl } from "@/lib/connect/returnUrlAllowlist";
import { computeSessionReceiptExpiresAt } from "@/lib/partner/sessionReceipt";
import { buildPartnerVerificationResult } from "@/lib/partner/partnerVerificationResult";
import type { PartnerVerificationResult } from "@/lib/partner/partnerVerificationResult";
import { policyExplicitlyRequiresProductEligibility } from "@/lib/policy/evaluatePolicy";
import { applyPartnerFlowTrustGate, type HolderAuthorizationState } from "@/lib/partner/partnerFlowCurrentAuthorization";
import { isSandboxPolicyId } from "@/lib/partner/sandboxPartner";
import { checkPartnerFlowRevocationGate } from "@/lib/partner/partnerFlowRevocationRuntime";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import {
  isGoodTroubleBrowseFlow,
  resolveGoodTroubleFlowPurpose,
} from "@/lib/partner/goodTroubleBrowseFlow";
import { isCanonicalGoodTroublePurchaseFlow } from "@/lib/partner/goodTroublePurchaseFlow";
import {
  expectedSelfAttestationPurpose,
  isAgeEligibilityOnlyPolicy,
} from "@/lib/policy/selfAttestationGuards";
import { getActiveSelfAttestations } from "@/lib/assurance/selfAttestation/selfAttestationLedger";
import { GOOD_TROUBLE_BROWSE_POLICY_ID } from "@/lib/goodTrouble/constants";
import {
  buildBrowseReturnUrl,
  reuseBrowseSelfAttestation,
} from "@/lib/assurance/selfAttestation/reuseBrowseSelfAttestation";
import { isContentOriginDisclosureFlow } from "@/lib/provenance/partnerFlow";
import { evaluateContentOriginDisclosurePartnerFlow } from "@/lib/provenance/provenancePartnerFlowOrchestration";
import {
  isContentOriginDisclosurePolicyId,
  resolveProvenanceSandboxCredentialJti,
} from "@/lib/provenance/constants";
import { buildProvenancePartnerVerificationResult } from "@/lib/partner/provenancePartnerResult";

const APP_URL = getPublicAppOrigin();
const ISSUER = process.env.ABRAXAS_ISSUER_URL ?? APP_URL;

export type PartnerFlowNextStep =
  | "authenticate"
  | "passport"
  | "enter"
  | "denied"
  | "pending_review"
  | "verification_required";

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
  /** Authoritative holder authorization — distinct from workflow/handoff completion. */
  holder_authorization_state?: HolderAuthorizationState;
}

export interface PartnerFlowStartInput {
  partnerId: string;
  policyId: string;
  returnUrl: string;
  suiAddress?: string;
}

export function buildPartnerEvidenceUrl(input: {
  verificationRequestId: string;
  partnerId: string;
  policyId: string;
  returnUrl: string;
  purpose?: string;
  appOrigin?: string;
}): string {
  const appUrl = (input.appOrigin ?? getPublicAppOrigin()).replace(/\/$/, "");
  const path = buildPartnerContinuePath({
    verificationRequestId: input.verificationRequestId,
    partnerId: input.partnerId,
    policyId: input.policyId,
    purpose: input.purpose
      ?? (input.policyId === GOOD_TROUBLE_BROWSE_POLICY_ID ? "browse" : undefined),
  });
  return `${appUrl}${path ?? "/partner/continue"}`;
}

/** @deprecated Prefer buildPartnerEvidenceUrl for partner-flow evidence steps. */
export function buildPassportUrl(input: {
  verificationRequestId: string;
  partnerId: string;
  policyId: string;
  returnUrl: string;
  purpose?: string;
  appOrigin?: string;
}): string {
  return buildPartnerEvidenceUrl(input);
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

  const { count: pendingDocs } = await sb
    .from("passport_documents")
    .select("id", { count: "exact", head: true })
    .or(`wallet_address.eq.${subject},sui_address.eq.${subject}`)
    .eq("stamp_id", "identity")
    .in("status", ["submitted", "under_review"]);

  const { count: pendingSessions } = await sb
    .from("identity_review_sessions")
    .select("id", { count: "exact", head: true })
    .eq("sui_address", subject)
    .eq("review_status", "pending");

  if ((pendingDocs ?? 0) > 0 || (pendingSessions ?? 0) > 0) {
    return { status: "pending_review" };
  }

  if (verification.status === "pending" || verification.status === "in_progress") {
    return { status: "none" };
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
  policyVersion?: number,
  options?: {
    submittedContentHash?: string | null;
    verificationRequestId?: string | null;
  },
) {
  return evaluatePolicyForSubject({
    suiAddress,
    policyId,
    partnerId,
    policyVersion,
    submittedContentHash: options?.submittedContentHash,
    verificationRequestId: options?.verificationRequestId,
  });
}

async function denyIfPartnerFlowRevoked(input: {
  suiAddress: string;
  partnerId: string;
  policyId: string;
  operation: "evaluate" | "complete" | "refresh";
  verificationRequestId?: string;
}): Promise<PartnerFlowEvaluateResult | null> {
  const denied = await checkPartnerFlowRevocationGate({
    subjectId: input.suiAddress,
    partnerId: input.partnerId,
    policyId: input.policyId,
    operation: input.operation,
    verificationRequestId: input.verificationRequestId,
  });
  if (!denied) return null;
  const policy = await getPolicy(input.policyId);
  return {
    ...denied,
    policy_version: policy?.version,
  };
}

export async function issuePartnerSessionReceipt(input: {
  suiAddress: string;
  partnerId: string;
  policyId: string;
  credentialJti: string;
  verificationRequestId?: string;
  expectedPolicyVersion?: number;
  launchpadApplicationId?: string | null;
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
  const {
    correlationId,
    verificationRequestUuid,
    opaqueVerifyRequest,
  } = resolvePartnerFlowReceiptCorrelation(input.verificationRequestId);

  const idempotencyKey = resolvePartnerFlowIdempotencyKey({
    partnerId: input.partnerId,
    subjectId: subject,
    policyId: input.policyId,
    verificationRequestId: correlationId,
  });

  const identity = {
    partnerId: input.partnerId,
    subjectId: subject,
    policyId: input.policyId,
    verificationRequestId: correlationId,
  };

  let replay_status: PartnerFlowReplayStatus = "idempotent_replay";
  let decisionId: string | undefined;
  let receiptId: string | undefined;
  let receiptExpiresAt: string | undefined;
  let replacedReceiptId: string | null = null;

  if (verificationRequestUuid) {
    const byVr = await findDecisionByVerificationRequest({
      verificationRequestId: verificationRequestUuid,
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
    if (verificationRequestUuid) {
      const staleVrContext = await findReceiptForVerificationRequest({
        verificationRequestId: verificationRequestUuid,
        subjectId: subject,
      });
      if (staleVrContext?.receipt.status === "revoked") {
        throw new Error("receipt_revoked");
      }
    }

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
    const issuable = await resolveIssuablePolicyForPartner({
      policyId: input.policyId,
      partnerId: input.partnerId,
      expectedVersion: input.expectedPolicyVersion,
    });
    const { policy, evaluation } = await evaluateHolderPolicy(
      subject,
      input.partnerId,
      input.policyId,
      issuable.version,
      {
        verificationRequestId: input.verificationRequestId,
      },
    );
    const sessionExpires = computeSessionReceiptExpiresAt(policy.rules_json);

    const decisionInsertBase = {
      request_id: verificationRequestUuid ?? null,
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
        await getActiveClaimsForPolicyEvaluation(subject),
        claimTypesFromEvaluation(evaluation.claims),
        evaluation.matched_claim_ids,
      );

      const decisionContext = await resolveReceiptDecisionContext({
        policySandboxOnly: Boolean(policy.rules_json.sandbox_only),
        launchpadApplicationId: input.launchpadApplicationId,
      });

      const receipt = await issueReceiptForDecision({
        decisionId,
        partnerId: input.partnerId,
        policyId: policy.id,
        policyVersion: policy.version,
        subjectId: subject,
        applicationId: input.launchpadApplicationId ?? null,
        decisionResult: evaluation.decision === "approved" ? "approved" : evaluation.decision === "manual_review" ? "manual_review" : "denied",
        reasonCodes: evaluation.reason_codes,
        claimsJson: evaluation.claims,
        evaluatedClaimRefs: claimRefs,
        expiresAt: sessionExpires,
        decisionContext,
      });

      if (!receipt) throw new Error("Failed to issue session receipt");
      receiptId = receipt.id;
      receiptExpiresAt = sessionExpires;
      replay_status = "issued";

      if (replacedReceiptId && receiptId) {
        try {
          const { recordReceiptSupersessionBestEffort } = await import("@/lib/decisionReceipts/receiptSupersession");
          await recordReceiptSupersessionBestEffort({
            supersededReceiptId: replacedReceiptId,
            supersedingReceiptId: receiptId,
            partnerId: input.partnerId,
            policyId: policy.id,
            policyVersion: policy.version,
            subjectPseudonymId: receipt.subject_pseudonym_id ?? undefined,
            launchpadApplicationId: input.launchpadApplicationId ?? null,
            scope: "session_refresh",
          });
          const { recordIntegrationEventBestEffort } = await import("@/lib/partner/integrationObservability/record");
          await recordIntegrationEventBestEffort({
            partnerId: input.partnerId,
            applicationId: input.launchpadApplicationId ?? null,
            environment: decisionContext === "production" ? "production" : "sandbox",
            eventType: "receipt_superseded",
            lifecycleStage: "receipt",
            outcome: "superseded",
            receiptId: replacedReceiptId,
            policyId: policy.id,
            policyVersion: policy.version,
            metadata: { outcome_class: "session_refresh" },
          });
        } catch {
          // Supersession must not block issuance.
        }
      }
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

  if (opaqueVerifyRequest && receiptId) {
    try {
      const { bindHandoffToIssuedReceipt } = await import("@/lib/partner/hostedHandoff");
      await bindHandoffToIssuedReceipt({
        verifyRequest: opaqueVerifyRequest,
        partnerId: input.partnerId,
        policyId: input.policyId,
        publicReceiptId: receiptId,
      });
    } catch {
      // Handoff bind is best-effort; Partner Kit still re-fetches the current receipt.
    }
    try {
      const { bindPresentationResultToIssuedReceipt } = await import("@/lib/eligibilityPresentation/complete");
      await bindPresentationResultToIssuedReceipt({
        partnerId: input.partnerId,
        policyId: input.policyId,
        policyVersion: storedReceipt.policy_version,
        receipt: storedReceipt,
      });
    } catch {
      // Presentation bind is fail-closed at issue time if no exact completed result exists.
    }
  }

  const allowSandbox = storedReceipt.decision_context === "sandbox_only"
    || isSandboxPolicyId(input.policyId);
  const trust = await evaluateDecisionReceiptTrust(storedReceipt, {
    partnerId: input.partnerId,
    policyId: input.policyId,
    allowSandbox,
  });

  const { policy, evaluation } = await evaluateHolderPolicy(
    subject,
    input.partnerId,
    input.policyId,
    storedReceipt.policy_version,
  );
  const evaluatedAt = new Date().toISOString();
  const identityVerified = Boolean(evaluation.claims.identity_verified);
  const productEligibilityRequired = policyExplicitlyRequiresProductEligibility(policy.rules_json);
  const productEligibilityVerified = Boolean(evaluation.claims.product_eligibility);
  const basePartnerResult = buildPartnerVerificationResult({
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
    productEligibilityRequired,
    productEligibilityVerified,
    assuranceLevel: identityVerified ? "L2" : null,
    reasonCodes: evaluation.reason_codes,
  });
  const partner_result = isContentOriginDisclosurePolicyId(policy.id)
    ? buildProvenancePartnerVerificationResult({ base: basePartnerResult, evaluation })
    : basePartnerResult;

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

/** Good Trouble L0 purchase pilot — self-attestation only; never ID, camera, or liveness. */
export async function evaluateGoodTroublePurchaseFlow(input: {
  suiAddress: string;
  partnerId: string;
  policyId: string;
  returnUrl: string;
  purpose?: "purchase";
  appOrigin?: string;
  expectedPolicyVersion?: number;
}): Promise<PartnerFlowEvaluateResult> {
  const subject = normalizeSuiAddress(input.suiAddress);

  const revoked = await denyIfPartnerFlowRevoked({
    suiAddress: subject,
    partnerId: input.partnerId,
    policyId: input.policyId,
    operation: "evaluate",
  });
  if (revoked) return revoked;

  const policy = await getPolicy(input.policyId);
  if (!policy || !isAgeEligibilityOnlyPolicy(policy.rules_json)) {
    throw new Error("purchase_age_eligibility_policy_required");
  }

  const attestationPurpose = expectedSelfAttestationPurpose(policy.rules_json);
  const existingAttestation = await getActiveSelfAttestations({
    holderRef: subject,
    partnerId: policy.partner_id,
    policyId: input.policyId,
    purpose: attestationPurpose,
  });
  if (existingAttestation.some((row) => row.age_band === "over_21")) {
    const request = await createVerificationRequest({
      partnerId: input.partnerId,
      policyId: input.policyId,
      purpose: input.purpose ?? "purchase",
      requestedAction: policy.rules_json.product_eligibility_action ?? "partner_eligibility",
      suiAddress: subject,
      returnUrl: input.returnUrl,
      appOrigin: input.appOrigin,
      expectedPolicyVersion: input.expectedPolicyVersion ?? policy.version,
    });
    const passport_url = buildPassportUrl({
      verificationRequestId: request.request_id,
      partnerId: input.partnerId,
      policyId: input.policyId,
      returnUrl: input.returnUrl,
      purpose: "purchase",
      appOrigin: input.appOrigin,
    });
    return {
      next: "passport",
      verification_request_id: request.request_id,
      passport_url,
      policy_version: policy.version,
    };
  }

  const request = await createVerificationRequest({
    partnerId: input.partnerId,
    policyId: input.policyId,
    purpose: input.purpose ?? "purchase",
    requestedAction: policy.rules_json.product_eligibility_action ?? "partner_eligibility",
    suiAddress: subject,
    returnUrl: input.returnUrl,
    appOrigin: input.appOrigin,
    expectedPolicyVersion: input.expectedPolicyVersion ?? policy.version,
  });

  const passport_url = buildPassportUrl({
    verificationRequestId: request.request_id,
    partnerId: input.partnerId,
    policyId: input.policyId,
    returnUrl: input.returnUrl,
    purpose: "purchase",
    appOrigin: input.appOrigin,
  });

  return {
    next: "passport",
    verification_request_id: request.request_id,
    passport_url,
    policy_version: policy.version,
  };
}

/** Good Trouble L0 browse — self-attestation only; never purchase, ID, or manual review. */
export async function evaluateGoodTroubleBrowseFlow(input: {
  suiAddress: string;
  partnerId: string;
  policyId: string;
  returnUrl: string;
  purpose?: "browse";
  appOrigin?: string;
}): Promise<PartnerFlowEvaluateResult> {
  const subject = normalizeSuiAddress(input.suiAddress);

  const revoked = await denyIfPartnerFlowRevoked({
    suiAddress: subject,
    partnerId: input.partnerId,
    policyId: input.policyId,
    operation: "evaluate",
  });
  if (revoked) return revoked;

  const reuse = await reuseBrowseSelfAttestation({
    holderRef: subject,
    partnerId: input.partnerId,
    policyId: input.policyId,
    returnUrl: input.returnUrl,
  });

  if (reuse.ok) {
    const redirect_url = buildBrowseReturnUrl(input.returnUrl, {
      browseReceipt: reuse.browse_receipt,
      browseReceiptId: reuse.browse_receipt_id,
      policyId: input.policyId,
    });
    const policy = await getPolicy(input.policyId);
    if (redirect_url) {
      return {
        next: "enter",
        redirect_url,
        policy_version: policy?.version,
      };
    }
  }

  const policy = await getPolicy(input.policyId);
  const request = await createVerificationRequest({
    partnerId: input.partnerId,
    policyId: input.policyId,
    purpose: input.purpose ?? "browse",
    requestedAction: policy?.rules_json.product_eligibility_action ?? "partner_eligibility",
    suiAddress: subject,
    returnUrl: input.returnUrl,
    appOrigin: input.appOrigin,
  });

  const passport_url = buildPassportUrl({
    verificationRequestId: request.request_id,
    partnerId: input.partnerId,
    policyId: input.policyId,
    returnUrl: input.returnUrl,
    purpose: "browse",
    appOrigin: input.appOrigin,
  });

  return {
    next: "passport",
    verification_request_id: request.request_id,
    passport_url,
    policy_version: policy?.version,
  };
}

export async function evaluatePartnerFlow(input: {
  suiAddress?: string | null;
  partnerId: string;
  policyId: string;
  returnUrl: string;
  purpose?: string;
  appOrigin?: string;
  expectedPolicyVersion?: number;
  launchpadApplicationId?: string | null;
  expectedContentHash?: string | null;
}): Promise<PartnerFlowEvaluateResult> {
  if (!await isReturnUrlAllowed(input.partnerId, input.returnUrl)) {
    throw new Error("return_url not allowlisted for partner");
  }

  if (!input.suiAddress) {
    return { next: "authenticate" };
  }

  const resolvedPurpose = resolveGoodTroubleFlowPurpose({
    partnerId: input.partnerId,
    policyId: input.policyId,
    purpose: input.purpose,
    returnUrl: input.returnUrl,
  });
  const effectivePurpose = resolvedPurpose ?? input.purpose;

  if (isContentOriginDisclosureFlow({ policyId: input.policyId })) {
    return evaluateContentOriginDisclosurePartnerFlow({
      suiAddress: input.suiAddress,
      partnerId: input.partnerId,
      policyId: input.policyId,
      returnUrl: input.returnUrl,
      purpose: input.purpose,
      appOrigin: input.appOrigin,
      expectedPolicyVersion: input.expectedPolicyVersion,
      launchpadApplicationId: input.launchpadApplicationId,
      expectedContentHash: input.expectedContentHash,
    });
  }

  if (isGoodTroubleBrowseFlow({
    partnerId: input.partnerId,
    policyId: input.policyId,
    purpose: effectivePurpose,
  })) {
    return evaluateGoodTroubleBrowseFlow({
      suiAddress: input.suiAddress,
      partnerId: input.partnerId,
      policyId: input.policyId,
      returnUrl: input.returnUrl,
      appOrigin: input.appOrigin,
      purpose: "browse",
    });
  }

  if (isCanonicalGoodTroublePurchaseFlow({
    partnerId: input.partnerId,
    policyId: input.policyId,
    purpose: effectivePurpose,
  })) {
    const purchasePolicy = await getPolicy(input.policyId);
    if (purchasePolicy && isAgeEligibilityOnlyPolicy(purchasePolicy.rules_json)) {
      return evaluateGoodTroublePurchaseFlow({
        suiAddress: input.suiAddress,
        partnerId: input.partnerId,
        policyId: input.policyId,
        returnUrl: input.returnUrl,
        appOrigin: input.appOrigin,
        purpose: "purchase",
        expectedPolicyVersion: input.expectedPolicyVersion,
      });
    }
  }

  const subject = normalizeSuiAddress(input.suiAddress);
  const credential = await getHolderCredentialStatus(subject);

  if (credential.status === "pending_review") {
    return { next: "pending_review" };
  }

  if (credential.status === "active" && credential.credential_jti) {
    const revoked = await denyIfPartnerFlowRevoked({
      suiAddress: subject,
      partnerId: input.partnerId,
      policyId: input.policyId,
      operation: "evaluate",
    });
    if (revoked) return revoked;

    const { policy, evaluation } = await evaluateHolderPolicy(
      subject,
      input.partnerId,
      input.policyId,
      input.expectedPolicyVersion,
    );

    if (evaluation.decision === "approved") {
      const { decision_id, receipt_id, receipt_expires_at, partner_result, replay_status, currently_valid, validity, invalidation_reasons } = await issuePartnerSessionReceipt({
        suiAddress: subject,
        partnerId: input.partnerId,
        policyId: input.policyId,
        credentialJti: credential.credential_jti,
        expectedPolicyVersion: input.expectedPolicyVersion,
        launchpadApplicationId: input.launchpadApplicationId,
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

      return applyPartnerFlowTrustGate({
        next: "enter",
        redirect_url,
        partner_result: { ...partner_result, receipt_id, receipt_expires_at },
        replay_status,
        currently_valid,
        validity,
        invalidation_reasons,
        decision_id,
        policy_version: policy.version,
      }, { currently_valid, validity, invalidation_reasons });
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
    purpose: effectivePurpose,
    requestedAction: (await getPolicy(input.policyId))?.rules_json.product_eligibility_action ?? "partner_eligibility",
    suiAddress: subject,
    returnUrl: input.returnUrl,
    appOrigin: input.appOrigin,
    expectedPolicyVersion: input.expectedPolicyVersion,
  });

  const passport_url = buildPassportUrl({
    verificationRequestId: request.request_id,
    partnerId: input.partnerId,
    policyId: input.policyId,
    returnUrl: input.returnUrl,
    purpose: effectivePurpose,
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
  expectedPolicyVersion?: number;
  launchpadApplicationId?: string | null;
}): Promise<PartnerFlowEvaluateResult & { ok: true } | { ok: false; error: string }> {
  if (!await isReturnUrlAllowed(input.partnerId, input.returnUrl)) {
    return { ok: false, error: "return_url not allowlisted for partner" };
  }

  const credential = await getHolderCredentialStatus(input.suiAddress);
  const provenanceFlow = isContentOriginDisclosurePolicyId(input.policyId);
  const credentialJti = credential.status === "active" && credential.credential_jti
    ? credential.credential_jti
    : provenanceFlow
      ? resolveProvenanceSandboxCredentialJti(input.suiAddress)
      : null;
  if (!credentialJti) {
    return { ok: false, error: "Credential not yet active" };
  }

  const revoked = await denyIfPartnerFlowRevoked({
    suiAddress: input.suiAddress,
    partnerId: input.partnerId,
    policyId: input.policyId,
    operation: "complete",
    verificationRequestId: input.verificationRequestId,
  });
  if (revoked) {
    return { ok: true, ...revoked };
  }

  const issued = await issuePartnerSessionReceipt({
    suiAddress: input.suiAddress,
    partnerId: input.partnerId,
    policyId: input.policyId,
    credentialJti,
    verificationRequestId: input.verificationRequestId,
    expectedPolicyVersion: input.expectedPolicyVersion,
    launchpadApplicationId: input.launchpadApplicationId,
  });

  const { decision_id, partner_result, receipt_id, receipt_expires_at, replay_status, currently_valid, validity, invalidation_reasons } = issued;
  const policy = await getPolicy(input.policyId);

  const redirect_url = buildRedirectUrl(input.returnUrl, {
    status: partner_result.decision,
    decision_id,
    receipt_id,
    receipt_expires_at,
    credential_id: credentialJti,
    policy_id: input.policyId,
    partner_id: input.partnerId,
  });

  const gated = applyPartnerFlowTrustGate({
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
  }, { currently_valid, validity, invalidation_reasons });

  return { ok: true, ...gated };
}

/** Re-issue session receipt when prior receipt expired but credential remains valid. */
export async function refreshPartnerSessionReceipt(input: {
  suiAddress: string;
  partnerId: string;
  policyId: string;
  returnUrl: string;
  expectedPolicyVersion?: number;
  launchpadApplicationId?: string | null;
}): Promise<PartnerFlowEvaluateResult> {
  const credential = await getHolderCredentialStatus(input.suiAddress);
  if (credential.status !== "active" || !credential.credential_jti) {
    return { next: "passport" };
  }

  const revoked = await denyIfPartnerFlowRevoked({
    suiAddress: input.suiAddress,
    partnerId: input.partnerId,
    policyId: input.policyId,
    operation: "refresh",
  });
  if (revoked) return revoked;

  const { policy, evaluation } = await evaluateHolderPolicy(
    input.suiAddress,
    input.partnerId,
    input.policyId,
    input.expectedPolicyVersion,
  );
  if (evaluation.decision !== "approved") {
    return { next: "denied", reason_codes: evaluation.reason_codes, policy_version: policy.version };
  }

  const { decision_id, receipt_id, receipt_expires_at, partner_result, replay_status, currently_valid, validity, invalidation_reasons, replaced_receipt_id } = await issuePartnerSessionReceipt({
    suiAddress: input.suiAddress,
    partnerId: input.partnerId,
    policyId: input.policyId,
    credentialJti: credential.credential_jti,
    supersedePriorSession: true,
    expectedPolicyVersion: input.expectedPolicyVersion,
    launchpadApplicationId: input.launchpadApplicationId,
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

  return applyPartnerFlowTrustGate({
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
  }, { currently_valid, validity, invalidation_reasons });
}

export { isReturnUrlAllowed as isAllowedPartnerReturnUrl } from "@/lib/connect/returnUrlAllowlist";
export { PartnerFlowIdempotencyConflictError } from "@/lib/partner/partnerFlowIdempotency";

/** Pure helper for tests — maps credential + policy evaluation to next step. */
export function resolvePartnerFlowStep(input: {
  credentialStatus: HolderCredentialStatus["status"];
  policyDecision: "approved" | "denied" | "manual_review";
  authenticated: boolean;
  /** L0 browse flows skip ID pending-review routing. */
  browseFlow?: boolean;
}): PartnerFlowNextStep {
  if (!input.authenticated) return "authenticate";
  if (!input.browseFlow && input.credentialStatus === "pending_review") return "pending_review";
  if (input.credentialStatus === "active" && input.policyDecision === "approved") return "enter";
  if (input.credentialStatus === "active" && input.policyDecision === "denied") return "denied";
  if (input.credentialStatus === "active" && input.policyDecision === "manual_review") return "pending_review";
  return "passport";
}
