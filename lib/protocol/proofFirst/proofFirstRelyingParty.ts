// FILE: lib/protocol/proofFirst/proofFirstRelyingParty.ts
// Independent RP path — no Abraxas API, identity DB, or retained document access.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { evaluatePublicReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import { verifyRecordSignatureWithRegistry } from "@/lib/decisionReceipts/verificationKeyLifecycle";
import { toPublicView } from "@/lib/decisionReceipts/views";
import type { RevocationSourceState } from "@/lib/institutionalCertification/build546/independentVerifier";
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
};

function bindingDenyOutcome(
  audit: ExternalRpDecisionAudit,
  denyCodes: string[],
): ProofFirstVerificationOutcome {
  return {
    ...audit,
    outcome: "denied",
    authorization_verified: false,
    presentation_binding_ok: false,
    presentation_binding_deny_codes: denyCodes,
    abraxas_infrastructure_required: false,
    identity_database_required: false,
    retained_documents_required: false,
    offline_crypto_checks: audit.verifier.checks_possible_offline,
    live_authority_checks: audit.verifier.checks_requiring_live_authority,
    partner_visible: {
      ...audit.partner_visible,
      result: "deny_presentation_binding",
      binding_deny_codes: denyCodes.join(","),
    },
  };
}

function finalizeOutcome(audit: ExternalRpDecisionAudit, bindingOk: boolean): ProofFirstVerificationOutcome {
  return {
    ...audit,
    presentation_binding_ok: bindingOk,
    abraxas_infrastructure_required: false,
    identity_database_required: false,
    retained_documents_required: false,
    offline_crypto_checks: audit.verifier.checks_possible_offline,
    live_authority_checks: audit.verifier.checks_requiring_live_authority,
  };
}

/**
 * Verify holder presentation entirely at the relying party.
 * Authorization-relevant partner/policy/claims come only from the signed receipt after binding checks.
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
  const harness = input.harness ?? new ExternalRelyingPartyHarness({
    partnerId: input.rp.partnerId,
    policyId: input.rp.policyId,
    allowSandbox: input.rp.allowSandbox,
    env: input.rp.env,
  });

  const binding = validatePresentationReceiptStrictBinding({
    presentation: input.presentation,
    relyingParty: { partnerId: input.rp.partnerId, policyId: input.rp.policyId },
  });
  if (!binding.ok) {
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
      revocationSource: input.revocationSource ?? { available: false, reason: "unavailable" },
    });
    return bindingDenyOutcome(audit, binding.deny_codes);
  }

  const custody = assertPresentationExcludesSensitiveCustody(input.presentation);
  if (!custody.ok) {
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
      revocationSource: input.revocationSource ?? { available: false, reason: "unavailable" },
    });
    return {
      ...bindingDenyOutcome(audit, [custody.reason]),
      partner_visible: { ...audit.partner_visible, result: custody.reason },
    };
  }

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
