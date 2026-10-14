// FILE: lib/protocol/proofFirst/proofFirstRelyingParty.ts
// Independent RP path — no Abraxas API, identity DB, or retained document access.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { evaluatePublicReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import { verifyRecordSignatureWithRegistry } from "@/lib/decisionReceipts/verificationKeyLifecycle";
import { toPublicView } from "@/lib/decisionReceipts/views";
import {
  verifyReceiptIndependently,
  type RevocationSourceState,
} from "@/lib/institutionalCertification/build546/independentVerifier";
import { ExternalRelyingPartyHarness } from "@/lib/institutionalCertification/build546/externalRelyingParty";
import type { ExternalRpDecisionAudit } from "@/lib/institutionalCertification/build546/externalRelyingParty";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  assertPresentationExcludesSensitiveCustody,
  type HolderPolicyScopedPresentation,
} from "./holderPolicyPresentation";
import { validatePresentationReceiptStrictBinding } from "./presentationReceiptBinding";

function partnerFlowViewFromSignedRecord(
  record: DecisionReceiptRecord,
  now: Date,
  expectations: { partnerId: string; policyId: string },
  env?: Record<string, string | undefined>,
): PartnerFlowPublicReceipt {
  const pub = toPublicView(record);
  const signatureValid = verifyRecordSignatureWithRegistry(record, now, env);
  const pubForTrust = { ...pub, signature_valid: signatureValid };
  const trust = evaluatePublicReceiptTrust(pubForTrust, {
    partnerId: expectations.partnerId,
    policyId: expectations.policyId,
    now,
  });
  return {
    ...pubForTrust,
    currently_valid: trust.currently_valid,
    signature_valid: trust.signature_valid,
    validity: trust.validity,
    issued_valid: trust.currently_valid,
    lifecycle_status: trust.currently_valid ? "active" : trust.validity,
    invalidation_reasons: trust.invalidation_reasons,
    validity_checked_at: now.toISOString(),
  };
}

export type ProofFirstRelyingPartyConfig = {
  partnerId: string;
  policyId: string;
  allowSandbox?: boolean;
  env?: Record<string, string | undefined>;
};

export type ProofFirstVerificationOutcome = ExternalRpDecisionAudit & {
  abraxas_infrastructure_required: false;
  identity_database_required: false;
  retained_documents_required: false;
  offline_crypto_checks: string[];
  live_authority_checks: string[];
  presentation_binding_ok: boolean;
  presentation_binding_deny_codes?: string[];
  /** True when outcome was decided without mutating RP consumption state. */
  consumption_skipped_preflight_reject?: boolean;
};

function preflightRejectOutcome(input: {
  requestId: string;
  signed: DecisionReceiptRecord;
  now: Date;
  rp: ProofFirstRelyingPartyConfig;
  revocationSource?: RevocationSourceState;
  denyCodes: string[];
  partnerResult: string;
  bindingOk: boolean;
}): ProofFirstVerificationOutcome {
  const publicReceipt = partnerFlowViewFromSignedRecord(
    input.signed,
    input.now,
    { partnerId: input.signed.partner_id, policyId: input.signed.policy_id },
    input.rp.env,
  );
  const verifier = verifyReceiptIndependently({
    signedRecord: input.signed,
    publicReceipt,
    expectations: {
      partnerId: input.rp.partnerId,
      policyId: input.rp.policyId,
      allowSandbox: input.rp.allowSandbox,
    },
    now: input.now,
    env: input.rp.env,
    revocationSource: input.revocationSource,
  });

  return {
    request_id: input.requestId,
    receipt_id: input.signed.id,
    at: input.now.toISOString(),
    outcome: "denied",
    verifier,
    authorization_verified: false,
    durable_consumption_marker: false,
    durable_audit_logged: false,
    consumption_recorded: false,
    replay_detected: false,
    consumption_id: null,
    partner_visible: {
      result: input.partnerResult,
      receipt_id: input.signed.id,
      policy_id: input.rp.policyId,
      binding_deny_codes: input.denyCodes.join(","),
    },
    presentation_binding_ok: input.bindingOk,
    presentation_binding_deny_codes: input.denyCodes,
    consumption_skipped_preflight_reject: true,
    abraxas_infrastructure_required: false,
    identity_database_required: false,
    retained_documents_required: false,
    offline_crypto_checks: verifier.checks_possible_offline,
    live_authority_checks: verifier.checks_requiring_live_authority,
  };
}

function finalizeOutcome(audit: ExternalRpDecisionAudit, bindingOk: boolean): ProofFirstVerificationOutcome {
  return {
    ...audit,
    presentation_binding_ok: bindingOk,
    consumption_skipped_preflight_reject: false,
    abraxas_infrastructure_required: false,
    identity_database_required: false,
    retained_documents_required: false,
    offline_crypto_checks: audit.verifier.checks_possible_offline,
    live_authority_checks: audit.verifier.checks_requiring_live_authority,
  };
}

/**
 * Verify holder presentation entirely at the relying party.
 * Invalid wrappers are rejected before any consumption / replay state mutation.
 */
export async function verifyHolderPresentationAtRelyingParty(input: {
  presentation: HolderPolicyScopedPresentation;
  requestId: string;
  rp: ProofFirstRelyingPartyConfig;
  now?: Date;
  revocationSource?: RevocationSourceState;
  harness?: ExternalRelyingPartyHarness;
}): Promise<ProofFirstVerificationOutcome> {
  const signed = input.presentation.signed_decision_receipt;
  const now = input.now ?? new Date();

  const binding = validatePresentationReceiptStrictBinding({
    presentation: input.presentation,
    relyingParty: { partnerId: input.rp.partnerId, policyId: input.rp.policyId },
  });
  if (!binding.ok) {
    return preflightRejectOutcome({
      requestId: input.requestId,
      signed,
      now,
      rp: input.rp,
      revocationSource: input.revocationSource ?? { available: false, reason: "unavailable" },
      denyCodes: binding.deny_codes,
      partnerResult: "deny_presentation_binding",
      bindingOk: false,
    });
  }

  const custody = assertPresentationExcludesSensitiveCustody(input.presentation);
  if (!custody.ok) {
    return preflightRejectOutcome({
      requestId: input.requestId,
      signed,
      now,
      rp: input.rp,
      revocationSource: input.revocationSource ?? { available: false, reason: "unavailable" },
      denyCodes: [custody.reason],
      partnerResult: custody.reason,
      bindingOk: true,
    });
  }

  const harness = input.harness ?? new ExternalRelyingPartyHarness({
    partnerId: input.rp.partnerId,
    policyId: input.rp.policyId,
    allowSandbox: input.rp.allowSandbox,
    env: input.rp.env,
  });

  const audit = await harness.decide({
    requestId: input.requestId,
    signedRecord: signed,
    publicReceipt: partnerFlowViewFromSignedRecord(
      signed,
      now,
      { partnerId: signed.partner_id, policyId: signed.policy_id },
      input.rp.env,
    ),
    now,
    revocationSource: input.revocationSource,
  });

  return finalizeOutcome(audit, true);
}
