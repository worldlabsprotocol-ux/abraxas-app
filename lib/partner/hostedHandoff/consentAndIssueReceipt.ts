// FILE: lib/partner/hostedHandoff/consentAndIssueReceipt.ts
// Holder consent + signed receipt issuance for opaque hosted handoffs (vr_*).

import type { NextRequest } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { isOpaqueVerifyRequest } from "@/lib/partner/partnerFlowContinuationIdentifiers";
import {
  assertIdempotentPartnerFlowIdentity,
  buildPartnerFlowVerificationRequestIdempotencyKey,
  resolvePartnerFlowIdempotencyKey,
} from "@/lib/partner/partnerFlowIdempotency";
import { requireQualifiedPartnerMethod } from "@/lib/partner/requirePartnerMethodQualification";
import { evaluatePolicyForSubject } from "@/lib/policy/evaluateSubjectPolicy";
import { evaluatePolicyVersionGate } from "@/lib/policy/changeControl/issuance";
import { deriveServerSandboxQualificationClaims } from "@/lib/partner/sandboxQualificationClaims";
import { resolveCompatibleReusableFact } from "@/lib/passport/reusableEligibility/qualify";
import { derivedClaimRefs, derivedReasonCodes, persistReuseDerivation } from "@/lib/passport/reusableEligibility/issue";
import { recordEvidenceReuseTelemetry } from "@/lib/passport/reusableEligibility/observability";
import type { InternalReusableFact } from "@/lib/passport/reusableEligibility/contract";
import { inferPolicyPackFromPolicyId } from "@/lib/partner/launchpad/policyPacks";
import { isSandboxPolicyId } from "@/lib/partner/sandboxPartner";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buildEvaluatedClaimRefs,
  claimTypesFromEvaluation,
} from "@/lib/decisionReceipts/claimRefs";
import { getReceiptByDecisionId, issueReceiptForDecision } from "@/lib/decisionReceipts/service";
import { resolveReceiptDecisionContext } from "@/lib/partner/launchpad/productionActivation";
import {
  findDecisionByIdempotencyKey,
} from "@/lib/partner/sessionDecision";
import {
  isMissingIdempotencyKeyColumnError,
  isVerificationDecisionIdempotencyKeyAvailable,
  markVerificationDecisionIdempotencyKeyAbsent,
} from "@/lib/partner/verificationDecisionsSchema";
import { appendAuditEvent } from "@/lib/verification/audit";
import {
  auditPartnerFlowStepBestEffort,
  flowTraceIdFromVerificationRequest,
} from "@/lib/partner/partnerFlowAudit";
import { PARTNER_FLOW_AUDIT_ACTIONS } from "@/lib/partner/partnerFlowAuditContract";
import { bindHandoffToIssuedReceipt, loadHandoffByVerifyRequest } from "@/lib/partner/hostedHandoff/store";
import type { HostedHandoffRecord } from "@/lib/partner/hostedHandoff/types";
import { isCanonicalGoodTroublePurchaseFlow } from "@/lib/partner/goodTroublePurchaseFlow";
import { isAgeEligibilityOnlyPolicy } from "@/lib/policy/selfAttestationGuards";
import { getPolicy } from "@/lib/verification/requestsService";

export class HostedHandoffConsentError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "HostedHandoffConsentError";
    this.code = code;
  }
}

export type HostedHandoffConsentResult = {
  decision_id: string;
  receipt_id: string | null;
  decision: string;
  claims: Record<string, unknown>;
  reason_codes: string[];
  valid_until: string | null;
  idempotent_replay: boolean;
};

function assertHandoffShareable(handoff: HostedHandoffRecord): void {
  if (handoff.status === "expired") {
    throw new HostedHandoffConsentError("stale", "Hosted handoff expired");
  }
  if (handoff.status === "cancelled") {
    throw new HostedHandoffConsentError("missing", "Hosted handoff unavailable");
  }
  if (handoff.status === "consumed") {
    throw new HostedHandoffConsentError("replay", "Hosted handoff already consumed");
  }
  const expires = Date.parse(handoff.expires_at);
  if (!Number.isFinite(expires) || expires <= Date.now()) {
    throw new HostedHandoffConsentError("stale", "Hosted handoff expired");
  }
  if (handoff.status !== "created") {
    throw new HostedHandoffConsentError("missing", "Hosted handoff unavailable");
  }
}

async function loadExistingOpaqueConsentDecision(input: {
  verifyRequest: string;
  subject: string;
  partnerId: string;
  policyId: string;
}): Promise<HostedHandoffConsentResult | null> {
  const idempotencyKey = buildPartnerFlowVerificationRequestIdempotencyKey(input.verifyRequest);
  const stored = await findDecisionByIdempotencyKey(idempotencyKey);
  if (!stored) return null;
  try {
    assertIdempotentPartnerFlowIdentity(stored, {
      partnerId: input.partnerId,
      subjectId: input.subject,
      policyId: input.policyId,
      verificationRequestId: input.verifyRequest,
    });
  } catch {
    throw new HostedHandoffConsentError("cross_partner", "Decision identity mismatch");
  }
  const receipt = await getReceiptByDecisionId(stored.decision_id);
  const { data: decisionRow } = await requireSupabaseAdmin()
    .from("verification_decisions")
    .select("decision, claims_json, reason_codes, valid_until")
    .eq("id", stored.decision_id)
    .maybeSingle();
  return {
    decision_id: stored.decision_id,
    receipt_id: receipt?.id ?? null,
    decision: String(decisionRow?.decision ?? "approved"),
    claims: (decisionRow?.claims_json as Record<string, unknown>) ?? {},
    reason_codes: Array.isArray(decisionRow?.reason_codes) ? decisionRow.reason_codes as string[] : [],
    valid_until: typeof decisionRow?.valid_until === "string" ? decisionRow.valid_until : null,
    idempotent_replay: true,
  };
}

export async function consentOpaqueHostedHandoff(input: {
  verifyRequest: string;
  suiAddress: string;
  request: NextRequest;
}): Promise<HostedHandoffConsentResult> {
  const verifyRequest = input.verifyRequest.trim();
  if (!isOpaqueVerifyRequest(verifyRequest)) {
    throw new HostedHandoffConsentError("invalid_verify_request", "Invalid hosted handoff reference");
  }

  const subject = normalizeSuiAddress(input.suiAddress);
  const handoff = await loadHandoffByVerifyRequest(verifyRequest);
  if (!handoff) {
    throw new HostedHandoffConsentError("missing", "Hosted handoff not found");
  }

  const existing = await loadExistingOpaqueConsentDecision({
    verifyRequest,
    subject,
    partnerId: handoff.partner_id,
    policyId: handoff.policy_id,
  });
  if (existing) {
    return existing;
  }

  assertHandoffShareable(handoff);

  if (!isCanonicalGoodTroublePurchaseFlow({
    partnerId: handoff.partner_id,
    policyId: handoff.policy_id,
    purpose: handoff.purpose,
  })) {
    const policy = await getPolicy(handoff.policy_id);
    if (!policy || !isAgeEligibilityOnlyPolicy(policy.rules_json)) {
      throw new HostedHandoffConsentError("invalid_flow", "Hosted handoff flow not supported");
    }
  }

  const qualified = await requireQualifiedPartnerMethod({
    request: input.request,
    verifyRequestId: verifyRequest,
    partnerId: handoff.partner_id,
    policyId: handoff.policy_id,
    policyVersion: handoff.policy_version,
    sessionSubject: subject,
  });
  if (!qualified.ok) {
    throw new HostedHandoffConsentError(qualified.code, "Method qualification required before consent");
  }
  if (
    qualified.record.partnerId !== handoff.partner_id
    || qualified.record.policyId !== handoff.policy_id
  ) {
    throw new HostedHandoffConsentError("cross_partner", "Handoff binding mismatch");
  }

  const policyRow = await getPolicy(handoff.policy_id);
  const gate = evaluatePolicyVersionGate({
    policy: policyRow,
    partnerId: handoff.partner_id,
    expectedVersion: handoff.policy_version,
    mode: "production_receipt",
  });
  if (!gate.ok) {
    throw new HostedHandoffConsentError(gate.code, "Policy version not issuable");
  }

  let additionalClaims = deriveServerSandboxQualificationClaims({
    record: qualified.record,
    subjectId: subject,
    storedPartnerId: handoff.partner_id,
    storedPolicyId: handoff.policy_id,
    storedPolicyVersion: handoff.policy_version,
  });

  let reuseFact: InternalReusableFact | null = null;
  if (qualified.record.methodId === "reuse_existing_proof") {
    const resolved = await resolveCompatibleReusableFact({
      subjectId: subject,
      targetPolicyId: handoff.policy_id,
      targetPolicyVersion: handoff.policy_version,
      relyingPartner: handoff.partner_id,
    });
    void recordEvidenceReuseTelemetry({
      partnerId: handoff.partner_id,
      policyId: handoff.policy_id,
      policyVersion: handoff.policy_version,
      environment: isSandboxPolicyId(handoff.policy_id) ? "sandbox" : "production",
      verifyRequestId: verifyRequest,
      fact: resolved.ok ? resolved.fact : null,
      decision: resolved.decision ?? {
        decision: "not_compatible",
        reason: resolved.state,
        assurance_level: "unknown",
        freshness_state: "expired",
        trust: {
          reusable: false,
          assurance_sufficient: false,
          freshness: "expired",
          compatibility: "incompatible",
          source_active: false,
          environment_allowed: false,
          consent_required: true,
          reasons: [resolved.state],
        },
      },
    });
    if (!resolved.ok) {
      throw new HostedHandoffConsentError("method_not_qualified", "Compatible proof unavailable");
    }
    reuseFact = resolved.fact;
  }

  let { policy, evaluation, claims } = await evaluatePolicyForSubject({
    suiAddress: subject,
    policyId: handoff.policy_id,
    partnerId: handoff.partner_id,
    policyVersion: handoff.policy_version,
    additionalClaims,
    verificationRequestId: verifyRequest,
  });

  if (reuseFact && evaluation.decision !== "approved") {
    const pack = inferPolicyPackFromPolicyId(handoff.policy_id);
    evaluation = {
      decision: "approved",
      claims: { [pack?.receipt_claim ?? "eligibility"]: true },
      reason_codes: derivedReasonCodes(),
      valid_until: reuseFact.expires_at,
      missing_claims: [],
      decision_context: reuseFact.decision_context,
      production_usable: reuseFact.decision_context === "production",
    };
  }

  if (evaluation.decision !== "approved") {
    throw new HostedHandoffConsentError("denied", "Holder does not meet policy requirements");
  }

  const idempotencyKey = resolvePartnerFlowIdempotencyKey({
    partnerId: handoff.partner_id,
    subjectId: subject,
    policyId: handoff.policy_id,
    verificationRequestId: verifyRequest,
  });

  const sb = requireSupabaseAdmin();
  const decisionInsertBase = {
    request_id: null,
    partner_id: handoff.partner_id,
    subject_id: subject,
    policy_id: policy.id,
    policy_version: policy.version,
    decision: evaluation.decision,
    claims_json: evaluation.claims,
    reason_codes: evaluation.reason_codes,
    valid_until: evaluation.valid_until,
  };

  const idempotencyKeyAvailable = await isVerificationDecisionIdempotencyKeyAvailable();
  let decisionInsertRow: typeof decisionInsertBase & { idempotency_key?: string } = decisionInsertBase;
  if (idempotencyKeyAvailable) {
    decisionInsertRow = { ...decisionInsertBase, idempotency_key: idempotencyKey };
  }

  let decisionId: string;
  let idempotentReplay = false;

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
    if (!raced) throw new HostedHandoffConsentError("store_unavailable", "Consent could not be recorded");
    assertIdempotentPartnerFlowIdentity(raced, {
      partnerId: handoff.partner_id,
      subjectId: subject,
      policyId: handoff.policy_id,
      verificationRequestId: verifyRequest,
    });
    decisionId = raced.decision_id;
    idempotentReplay = true;
  } else if (!decisionRow?.id) {
    throw new HostedHandoffConsentError("store_unavailable", insertError?.message ?? "Consent could not be recorded");
  } else {
    decisionId = decisionRow.id as string;
  }

  let receiptId: string | null = null;
  if (!idempotentReplay) {
    const { data: consent } = await sb.from("consent_receipts").insert({
      subject_id: subject,
      partner_id: handoff.partner_id,
      purpose: handoff.purpose,
      claims_authorized: Object.keys(evaluation.claims),
      expires_at: evaluation.valid_until,
    }).select("id").single();

    const claimTypes = claimTypesFromEvaluation(evaluation.claims);
    const evaluatedClaimRefs = reuseFact
      ? derivedClaimRefs(reuseFact, policy.id)
      : buildEvaluatedClaimRefs(
        claims,
        claimTypes.length ? claimTypes : Object.keys(evaluation.claims),
        evaluation.matched_claim_ids,
      );

    const decisionContext = await resolveReceiptDecisionContext({
      policySandboxOnly: Boolean(policy.rules_json.sandbox_only),
      launchpadApplicationId: handoff.application_id,
    });

    const receipt = await issueReceiptForDecision({
      decisionId,
      consentReceiptId: consent?.id as string | undefined,
      partnerId: handoff.partner_id,
      policyId: policy.id,
      policyVersion: policy.version,
      subjectId: subject,
      applicationId: handoff.application_id,
      decisionResult: evaluation.decision,
      reasonCodes: evaluation.reason_codes,
      claimsJson: evaluation.claims,
      evaluatedClaimRefs,
      expiresAt: evaluation.valid_until ?? new Date(Date.now() + 30 * 60_000).toISOString(),
      decisionContext: isSandboxPolicyId(policy.id) || evaluation.decision_context === "sandbox_only"
        ? "sandbox_only"
        : "production",
    });
    if (!receipt) {
      throw new HostedHandoffConsentError("store_unavailable", "Failed to issue decision receipt");
    }
    receiptId = receipt.id;

    if (reuseFact) {
      await persistReuseDerivation({
        fact: reuseFact,
        derivedReceiptId: receipt.id,
        derivedDecisionId: decisionId,
        requestingPartnerId: handoff.partner_id,
        requestingPolicyId: policy.id,
        requestingPolicyVersion: policy.version,
        verifyRequestId: verifyRequest,
      });
    }

    await bindHandoffToIssuedReceipt({
      verifyRequest,
      partnerId: handoff.partner_id,
      policyId: handoff.policy_id,
      publicReceiptId: receipt.id,
      bindingId: handoff.binding_id,
    });
  } else {
    const receipt = await getReceiptByDecisionId(decisionId);
    receiptId = receipt?.id ?? handoff.public_receipt_id;
  }

  await appendAuditEvent({
    actor_type: "subject",
    actor_id: subject,
    action: "verification.decided",
    object_type: "verification_decision",
    object_id: decisionId,
    policy_id: policy.id,
    policy_version: policy.version,
    metadata: {
      decision: evaluation.decision,
      reason_codes: evaluation.reason_codes,
      flow_trace_id: flowTraceIdFromVerificationRequest(verifyRequest),
      hosted_handoff: true,
      opaque_verify_request: true,
    },
  });

  void auditPartnerFlowStepBestEffort({
    flowTraceId: flowTraceIdFromVerificationRequest(verifyRequest),
    action: PARTNER_FLOW_AUDIT_ACTIONS.consent,
    partnerId: handoff.partner_id,
    policyId: policy.id,
    policyVersion: policy.version,
    subjectId: subject,
    outcome: evaluation.decision,
    decisionId,
    receiptId: receiptId ?? undefined,
    verificationRequestId: verifyRequest,
    reasonCodes: evaluation.reason_codes,
  });

  return {
    decision_id: decisionId,
    receipt_id: receiptId,
    decision: evaluation.decision,
    claims: evaluation.claims,
    reason_codes: evaluation.reason_codes,
    valid_until: evaluation.valid_until,
    idempotent_replay: idempotentReplay,
  };
}
