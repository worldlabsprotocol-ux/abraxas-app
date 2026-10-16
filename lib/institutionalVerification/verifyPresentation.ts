// FILE: lib/institutionalVerification/verifyPresentation.ts

import { ExternalRelyingPartyHarness } from "@/lib/institutionalCertification/build546/externalRelyingParty";
import { verifyHolderPresentationAtRelyingParty } from "@/lib/protocol/proofFirst/proofFirstRelyingParty";
import type {
  InstitutionalPresentationVerificationResult,
  VerifyHolderPresentationInput,
} from "./contract";
import { INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION } from "./contract";
import {
  mapPresentationFailure,
  presentationVerdictFromOutcome,
  receiptVerdictFromUnderlying,
} from "./reasonMapping";
import { inspectHolderPresentationCryptography } from "./inspectOnly";
import { requireConsumptionStoreForAuthorization } from "./replayPolicy";
import { verifyReceiptIndependently } from "@/lib/institutionalCertification/build546/independentVerifier";

export async function inspectHolderTrustPresentation(
  input: Omit<
    VerifyHolderPresentationInput,
    "verification_intent" | "consumption_store" | "allow_in_memory_consumption_for_tests"
  >,
): Promise<InstitutionalPresentationVerificationResult> {
  return verifyHolderTrustPresentation({
    ...input,
    verification_intent: "inspect_only",
  });
}

export async function verifyHolderTrustPresentation(
  input: VerifyHolderPresentationInput,
): Promise<InstitutionalPresentationVerificationResult> {
  const intent = input.verification_intent ?? "authorize";

  if (!input.presentation?.signed_decision_receipt?.id) {
    return {
      contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
      verification_intent: intent,
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

  if (intent === "inspect_only") {
    const inspected = await inspectHolderPresentationCryptography({
      presentation: input.presentation,
      relying_party: input.relying_party,
      trust_env: input.trust_env,
      portable_revocation_snapshot: input.portable_revocation_snapshot,
      portable_revocation: {
        issuerTrust: input.portable_revocation_issuer_trust,
        checkpointStore: input.checkpoint_store,
        bootstrapTrusts: input.portable_revocation_bootstrap_trusts ?? [],
        advanceCheckpointOnSuccess: false,
      },
      now: input.now,
    });
    const underlying = inspected.verifier;
    return {
      contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
      verification_intent: "inspect_only",
      verdict: receiptVerdictFromUnderlying(underlying) === "valid" && inspected.binding_ok && inspected.custody_ok
        ? "valid"
        : "invalid",
      authorize: false,
      rejection_reasons: [
        ...(!inspected.binding_ok ? (["presentation_binding_invalid"] as const) : []),
        ...mapPresentationFailure({
          request_id: input.request_id,
          receipt_id: input.presentation.signed_decision_receipt.id,
          at: (input.now ?? new Date()).toISOString(),
          outcome: "denied",
          verifier: underlying,
          authorization_verified: false,
          durable_consumption_marker: false,
          durable_audit_logged: false,
          consumption_recorded: false,
          replay_detected: false,
          consumption_id: null,
          partner_visible: { result: "inspect_only" },
          abraxas_infrastructure_required: false,
          identity_database_required: false,
          retained_documents_required: false,
          offline_crypto_checks: underlying.checks_possible_offline,
          live_authority_checks: underlying.checks_requiring_live_authority,
          presentation_binding_ok: inspected.binding_ok,
          presentation_binding_deny_codes: inspected.binding_deny_codes,
          portable_revocation_authenticated: inspected.portable_revocation_authenticated,
          portable_revocation_codes: inspected.portable_revocation_codes,
          unsigned_revocation_hint_rejected: false,
        }),
      ],
      detail_codes: [
        ...underlying.failure_codes,
        ...(inspected.portable_revocation_codes ?? []),
        ...(inspected.binding_deny_codes ?? []),
      ],
      offline_checks_completed: underlying.checks_possible_offline,
      live_checks_required: underlying.checks_requiring_live_authority,
      identity_database_required: false,
      abraxas_database_trust_root_required: false,
      replay_detected: false,
      portable_revocation_authenticated: inspected.portable_revocation_authenticated ?? false,
      underlying: {
        request_id: input.request_id,
        receipt_id: input.presentation.signed_decision_receipt.id,
        at: (input.now ?? new Date()).toISOString(),
        outcome: "denied",
        verifier: underlying,
        authorization_verified: false,
        durable_consumption_marker: false,
        durable_audit_logged: false,
        consumption_recorded: false,
        replay_detected: false,
        consumption_id: null,
        partner_visible: { result: "inspect_only" },
        abraxas_infrastructure_required: false,
        identity_database_required: false,
        retained_documents_required: false,
        offline_crypto_checks: underlying.checks_possible_offline,
        live_authority_checks: underlying.checks_requiring_live_authority,
        presentation_binding_ok: inspected.binding_ok,
        presentation_binding_deny_codes: inspected.binding_deny_codes,
        portable_revocation_authenticated: inspected.portable_revocation_authenticated,
        portable_revocation_codes: inspected.portable_revocation_codes,
        unsigned_revocation_hint_rejected: false,
      },
    };
  }

  const storeRequirement = requireConsumptionStoreForAuthorization({
    consumption_store: input.consumption_store,
    allow_in_memory_consumption_for_tests: input.allow_in_memory_consumption_for_tests,
  });
  if (!storeRequirement.ok) {
    const underlying = verifyReceiptIndependently({
      signedRecord: input.presentation.signed_decision_receipt,
      expectations: {
        partnerId: input.relying_party.partner_id,
        policyId: input.relying_party.policy_id,
        allowSandbox: input.relying_party.allow_sandbox,
      },
      now: input.now,
      env: input.trust_env,
    });
    return {
      contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
      verification_intent: "authorize",
      verdict: "blocked",
      authorize: false,
      rejection_reasons: ["durable_store_required"],
      detail_codes: ["durable_store_required"],
      offline_checks_completed: underlying.checks_possible_offline,
      live_checks_required: underlying.checks_requiring_live_authority,
      identity_database_required: false,
      abraxas_database_trust_root_required: false,
      replay_detected: false,
      portable_revocation_authenticated: false,
      underlying: {
        request_id: input.request_id,
        receipt_id: input.presentation.signed_decision_receipt.id,
        at: (input.now ?? new Date()).toISOString(),
        outcome: "blocked",
        verifier: underlying,
        authorization_verified: false,
        durable_consumption_marker: false,
        durable_audit_logged: false,
        consumption_recorded: false,
        replay_detected: false,
        consumption_id: null,
        partner_visible: { result: "durable_store_required" },
        abraxas_infrastructure_required: false,
        identity_database_required: false,
        retained_documents_required: false,
        offline_crypto_checks: underlying.checks_possible_offline,
        live_authority_checks: underlying.checks_requiring_live_authority,
        presentation_binding_ok: false,
      },
    };
  }

  const harness = new ExternalRelyingPartyHarness({
    partnerId: input.relying_party.partner_id,
    policyId: input.relying_party.policy_id,
    allowSandbox: input.relying_party.allow_sandbox,
    env: input.trust_env,
    consumptionStore: storeRequirement.store,
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
    verification_intent: "authorize",
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
