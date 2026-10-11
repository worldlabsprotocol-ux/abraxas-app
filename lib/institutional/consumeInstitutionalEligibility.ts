// Fail-closed institutional receipt consumption — reuses decision receipt trust plane.

import { getReceiptById } from "@/lib/decisionReceipts/service";
import { evaluateDecisionReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import { verifyRecordSignature } from "@/lib/decisionReceipts/views";
import { buildNarrowPartnerResultForReceipt } from "@/lib/partner/narrowPartnerResult/build";
import {
  INSTITUTIONAL_ELIGIBILITY_DECISION_SCHEMA,
  type InstitutionalEligibilityDecision,
  type InstitutionalEligibilityOutcome,
} from "@/lib/institutional/eligibilityDecisionContract";
import { consumeInstitutionalReplayNonce } from "@/lib/institutional/replayGuard";
import { recordInstitutionalSecuritySignal } from "@/lib/institutional/securityTelemetry";

export type InstitutionalConsumeInput = {
  partnerId: string;
  receiptId: string;
  policyId: string;
  policyVersion?: number;
  purpose?: string | null;
  actionScope?: string | null;
  applicationId?: string | null;
  correlationId?: string | null;
  replayNonce?: string | null;
  allowSandbox?: boolean;
};

export type InstitutionalConsumeResult =
  | { ok: true; decision: InstitutionalEligibilityDecision; narrow_result?: Awaited<ReturnType<typeof buildNarrowPartnerResultForReceipt>> }
  | { ok: false; status: 403 | 404 | 409; error: string; decision?: InstitutionalEligibilityDecision };

function correlationId(input: InstitutionalConsumeInput): string {
  return input.correlationId?.trim() || `corr_${input.receiptId.slice(0, 12)}`;
}

function mapOutcome(trust: Awaited<ReturnType<typeof evaluateDecisionReceiptTrust>>): InstitutionalEligibilityOutcome {
  if (!trust.signature_valid) return "deny";
  if (!trust.currently_valid) {
    const refreshHints = ["receipt_expired", "claim_expired", "stale", "superseded"];
    if (trust.invalidation_reasons.some(r => refreshHints.some(h => r.includes(h)))) {
      return "refresh_required";
    }
    return "deny";
  }
  return "permit";
}

export async function consumeInstitutionalEligibility(
  input: InstitutionalConsumeInput,
): Promise<InstitutionalConsumeResult> {
  const corr = correlationId(input);
  const record = await getReceiptById(input.receiptId);
  if (!record) {
    return { ok: false, status: 404, error: "receipt_not_found" };
  }

  if (record.partner_id !== input.partnerId) {
    void recordInstitutionalSecuritySignal({
      kind: "partner_mismatch",
      partnerId: input.partnerId,
      correlationId: corr,
      receiptId: input.receiptId,
      policyId: input.policyId,
      reasonCodes: [`expected_partner=${input.partnerId}`, `got=${record.partner_id}`],
    });
    return { ok: false, status: 403, error: "partner_mismatch" };
  }

  if (record.policy_id !== input.policyId) {
    void recordInstitutionalSecuritySignal({
      kind: "policy_mismatch",
      partnerId: input.partnerId,
      correlationId: corr,
      receiptId: input.receiptId,
      policyId: input.policyId,
      reasonCodes: [`policy_mismatch:expected=${input.policyId}`, `got=${record.policy_id}`],
    });
    return { ok: false, status: 403, error: "policy_mismatch" };
  }

  if (
    input.policyVersion != null
    && Number.isFinite(input.policyVersion)
    && record.policy_version !== input.policyVersion
  ) {
    void recordInstitutionalSecuritySignal({
      kind: "policy_mismatch",
      partnerId: input.partnerId,
      correlationId: corr,
      receiptId: input.receiptId,
      policyId: input.policyId,
      policyVersion: input.policyVersion,
      reasonCodes: [`policy_version_mismatch:expected=${input.policyVersion}`, `got=${record.policy_version}`],
    });
    return { ok: false, status: 403, error: "policy_version_mismatch" };
  }

  const signatureAuthentic = verifyRecordSignature(record);
  if (!signatureAuthentic) {
    void recordInstitutionalSecuritySignal({
      kind: "invalid_signature",
      partnerId: input.partnerId,
      correlationId: corr,
      receiptId: input.receiptId,
      policyId: input.policyId,
    });
  }

  if (input.replayNonce) {
    const replay = consumeInstitutionalReplayNonce({
      partnerId: input.partnerId,
      receiptId: input.receiptId,
      nonce: input.replayNonce,
    });
    if (!replay.ok) {
      void recordInstitutionalSecuritySignal({
        kind: "replay_attempt",
        partnerId: input.partnerId,
        correlationId: corr,
        receiptId: input.receiptId,
        policyId: input.policyId,
        reasonCodes: [replay.reason],
      });
      return { ok: false, status: 409, error: replay.reason === "replay" ? "replay_rejected" : "invalid_nonce" };
    }
  }

  const trust = await evaluateDecisionReceiptTrust(record, {
    partnerId: input.partnerId,
    policyId: input.policyId,
    allowSandbox: input.allowSandbox === true,
  });

  if (trust.validity === "access_revoked" || trust.invalidation_reasons.some(r => r.includes("revoked"))) {
    void recordInstitutionalSecuritySignal({
      kind: "revocation_observed",
      partnerId: input.partnerId,
      correlationId: corr,
      receiptId: input.receiptId,
      policyId: input.policyId,
      validityState: trust.validity,
      reasonCodes: trust.invalidation_reasons,
    });
  }

  const outcome = mapOutcome(trust);
  const currentlyActionable = outcome === "permit";

  const decision: InstitutionalEligibilityDecision = {
    schema: INSTITUTIONAL_ELIGIBILITY_DECISION_SCHEMA,
    outcome,
    signature_authentic: signatureAuthentic && trust.signature_valid,
    currently_actionable: currentlyActionable,
    partner_id: input.partnerId,
    application_id: input.applicationId ?? null,
    policy_id: record.policy_id,
    policy_version: record.policy_version,
    purpose: input.purpose ?? null,
    action_scope: input.actionScope ?? null,
    decision_result: record.decision_result,
    receipt_id: record.id,
    receipt_expires_at: record.expires_at ?? null,
    correlation_id: corr,
    validity_state: trust.validity,
    invalidation_reasons: trust.invalidation_reasons,
    production_usable: trust.production_usable,
    audit_event_id: null,
  };

  if (outcome === "deny" && trust.signature_valid) {
    void recordInstitutionalSecuritySignal({
      kind: "repeated_denial",
      partnerId: input.partnerId,
      correlationId: corr,
      receiptId: input.receiptId,
      policyId: input.policyId,
      validityState: trust.validity,
      reasonCodes: trust.invalidation_reasons,
    });
  }

  if (!currentlyActionable) {
    return { ok: false, status: 403, error: "not_currently_actionable", decision };
  }

  let narrow_result: Awaited<ReturnType<typeof buildNarrowPartnerResultForReceipt>> | undefined;
  try {
    narrow_result = await buildNarrowPartnerResultForReceipt(input.receiptId);
  } catch {
    return { ok: false, status: 403, error: "narrow_result_unavailable", decision };
  }

  return { ok: true, decision, narrow_result };
}
