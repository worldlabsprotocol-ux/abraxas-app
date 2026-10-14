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
};

/**
 * Verify holder presentation entirely at the relying party.
 * Uses signed decision receipt + local key registry + RP replay store only.
 */
export async function verifyHolderPresentationAtRelyingParty(input: {
  presentation: HolderPolicyScopedPresentation;
  requestId: string;
  rp: ProofFirstRelyingPartyConfig;
  now?: Date;
  revocationSource?: RevocationSourceState;
  harness?: ExternalRelyingPartyHarness;
}): Promise<ProofFirstVerificationOutcome> {
  const custody = assertPresentationExcludesSensitiveCustody(input.presentation);
  if (!custody.ok) {
    const harness = input.harness ?? new ExternalRelyingPartyHarness({
      partnerId: input.rp.partnerId,
      policyId: input.rp.policyId,
      allowSandbox: input.rp.allowSandbox,
      env: input.rp.env,
    });
    const now = input.now ?? new Date();
    const audit = await harness.decide({
      requestId: input.requestId,
      signedRecord: input.presentation.signed_decision_receipt,
      publicReceipt: partnerFlowViewFromSignedRecord(
        input.presentation.signed_decision_receipt,
        now,
        { partnerId: input.rp.partnerId, policyId: input.rp.policyId },
        input.rp.env,
      ),
      now,
      revocationSource: input.revocationSource ?? { available: false, reason: "unavailable" },
    });
    return {
      ...audit,
      outcome: "denied",
      abraxas_infrastructure_required: false,
      identity_database_required: false,
      retained_documents_required: false,
      offline_crypto_checks: audit.verifier.checks_possible_offline,
      live_authority_checks: audit.verifier.checks_requiring_live_authority,
      partner_visible: { ...audit.partner_visible, result: custody.reason },
    };
  }

  if (
    input.presentation.policy_id !== input.rp.policyId
    || input.presentation.audience_partner_id !== input.rp.partnerId
  ) {
    const harness = new ExternalRelyingPartyHarness({
      partnerId: input.rp.partnerId,
      policyId: input.rp.policyId,
      allowSandbox: input.rp.allowSandbox,
      env: input.rp.env,
    });
    const now = input.now ?? new Date();
    const audit = await harness.decide({
      requestId: input.requestId,
      signedRecord: input.presentation.signed_decision_receipt,
      publicReceipt: partnerFlowViewFromSignedRecord(
        input.presentation.signed_decision_receipt,
        now,
        { partnerId: input.rp.partnerId, policyId: input.rp.policyId },
        input.rp.env,
      ),
      now,
      revocationSource: input.revocationSource,
    });
    return {
      ...audit,
      abraxas_infrastructure_required: false,
      identity_database_required: false,
      retained_documents_required: false,
      offline_crypto_checks: audit.verifier.checks_possible_offline,
      live_authority_checks: audit.verifier.checks_requiring_live_authority,
    };
  }

  const harness = input.harness ?? new ExternalRelyingPartyHarness({
    partnerId: input.rp.partnerId,
    policyId: input.rp.policyId,
    allowSandbox: input.rp.allowSandbox,
    env: input.rp.env,
  });

  const now = input.now ?? new Date();
  const audit = await harness.decide({
    requestId: input.requestId,
    signedRecord: input.presentation.signed_decision_receipt,
    publicReceipt: partnerFlowViewFromSignedRecord(
      input.presentation.signed_decision_receipt,
      now,
      { partnerId: input.rp.partnerId, policyId: input.rp.policyId },
      input.rp.env,
    ),
    now,
    revocationSource: input.revocationSource,
  });

  return {
    ...audit,
    abraxas_infrastructure_required: false,
    identity_database_required: false,
    retained_documents_required: false,
    offline_crypto_checks: audit.verifier.checks_possible_offline,
    live_authority_checks: audit.verifier.checks_requiring_live_authority,
  };
}
