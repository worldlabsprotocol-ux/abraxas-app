// FILE: lib/institutionalVerification/verifyPresentation.ts

import { ExternalRelyingPartyHarness } from "@/lib/institutionalCertification/build546/externalRelyingParty";
import { InMemoryReceiptConsumptionStore } from "@/lib/institutionalCertification/build547/receiptConsumptionStore";
import { verifyHolderPresentationAtRelyingParty } from "@/lib/protocol/proofFirst/proofFirstRelyingParty";
import type {
  InstitutionalPresentationVerificationResult,
  VerifyHolderPresentationInput,
} from "./contract";
import { INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION } from "./contract";
import {
  mapPresentationFailure,
  presentationVerdictFromOutcome,
} from "./reasonMapping";

export async function verifyHolderTrustPresentation(
  input: VerifyHolderPresentationInput,
): Promise<InstitutionalPresentationVerificationResult> {
  if (!input.presentation?.signed_decision_receipt?.id) {
    return {
      contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
      verdict: "invalid",
      authorize: false,
      rejection_reasons: ["malformed_input"],
      detail_codes: ["malformed_input"],
      offline_checks_completed: [],
      live_checks_required: [],
      identity_database_required: false,
      abraxas_database_trust_root_required: false,
      replay_detected: false,
      portable_revocation_authenticated: false,
      underlying: {
        request_id: input.request_id,
        receipt_id: "unknown",
        at: (input.now ?? new Date()).toISOString(),
        outcome: "denied",
        verifier: {
          verdict: "reject",
          cryptographically_authentic: false,
          currently_authorizable: false,
          phases: [],
          failure_codes: ["malformed_input"],
          checks_possible_offline: [],
          checks_requiring_live_authority: [],
          disclaimer: "",
        },
        authorization_verified: false,
        durable_consumption_marker: false,
        durable_audit_logged: false,
        consumption_recorded: false,
        replay_detected: false,
        consumption_id: null,
        partner_visible: { result: "malformed_input" },
        abraxas_infrastructure_required: false,
        identity_database_required: false,
        retained_documents_required: false,
        offline_crypto_checks: [],
        live_authority_checks: [],
        presentation_binding_ok: false,
      },
    };
  }

  const harness = new ExternalRelyingPartyHarness({
    partnerId: input.relying_party.partner_id,
    policyId: input.relying_party.policy_id,
    allowSandbox: input.relying_party.allow_sandbox,
    env: input.trust_env,
    consumptionStore: input.consumption_store ?? new InMemoryReceiptConsumptionStore(),
  });

  const outcome = await verifyHolderPresentationAtRelyingParty({
    presentation: input.presentation,
    requestId: input.request_id,
    now: input.now,
    portableRevocationSnapshot: input.portable_revocation_snapshot,
    rp: {
      partnerId: input.relying_party.partner_id,
      policyId: input.relying_party.policy_id,
      allowSandbox: input.relying_party.allow_sandbox,
      env: input.trust_env,
      portableRevocation: {
        issuerTrust: input.portable_revocation_issuer_trust,
        checkpointStore: input.checkpoint_store,
        bootstrapTrusts: input.portable_revocation_bootstrap_trusts ?? [],
        advanceCheckpointOnSuccess: input.advance_revocation_checkpoint ?? true,
      },
    },
    harness,
  });

  const verdict = presentationVerdictFromOutcome(outcome);
  return {
    contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
    verdict,
    authorize: outcome.outcome === "granted" && outcome.authorization_verified,
    rejection_reasons: mapPresentationFailure(outcome),
    detail_codes: [
      ...outcome.verifier.failure_codes,
      ...(outcome.portable_revocation_codes ?? []),
      ...(outcome.presentation_binding_deny_codes ?? []),
    ],
    offline_checks_completed: outcome.offline_crypto_checks,
    live_checks_required: outcome.live_authority_checks,
    identity_database_required: false,
    abraxas_database_trust_root_required: false,
    replay_detected: outcome.replay_detected,
    portable_revocation_authenticated: outcome.portable_revocation_authenticated ?? false,
    underlying: outcome,
  };
}
