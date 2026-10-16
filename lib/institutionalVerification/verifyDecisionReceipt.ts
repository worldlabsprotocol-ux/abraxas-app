// FILE: lib/institutionalVerification/verifyDecisionReceipt.ts

import { verifyReceiptIndependently } from "@/lib/institutionalCertification/build546/independentVerifier";
import { ExternalRelyingPartyHarness } from "@/lib/institutionalCertification/build546/externalRelyingParty";
import type {
  InstitutionalReceiptVerificationResult,
  VerifySignedDecisionReceiptInput,
} from "./contract";
import { INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION } from "./contract";
import {
  mapReceiptFailureCodes,
  receiptVerdictFromUnderlying,
} from "./reasonMapping";
import { inspectSignedDecisionReceiptCryptography } from "./inspectOnly";
import { requireConsumptionStoreForAuthorization } from "./replayPolicy";

function blockedResult(input: {
  underlying: ReturnType<typeof verifyReceiptIndependently>;
  rejection_reasons: VerifySignedDecisionReceiptInput extends never ? never : ("durable_store_required" | "malformed_input")[];
  intent: "authorize" | "inspect_only";
}): InstitutionalReceiptVerificationResult {
  return {
    contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
    verification_intent: input.intent,
    verdict: "blocked",
    authorize: false,
    rejection_reasons: input.rejection_reasons,
    detail_codes: input.rejection_reasons,
    offline_checks_completed: input.underlying.checks_possible_offline,
    live_checks_required: input.underlying.checks_requiring_live_authority,
    identity_database_required: false,
    abraxas_database_trust_root_required: false,
    underlying: input.underlying,
  };
}

export async function inspectSignedDecisionReceipt(
  input: Omit<VerifySignedDecisionReceiptInput, "verification_intent" | "consumption_store" | "enforce_single_use">,
): Promise<InstitutionalReceiptVerificationResult> {
  return verifySignedDecisionReceipt({
    ...input,
    verification_intent: "inspect_only",
  });
}

export async function verifySignedDecisionReceipt(
  input: VerifySignedDecisionReceiptInput,
): Promise<InstitutionalReceiptVerificationResult> {
  const intent = input.verification_intent ?? "authorize";

  if (!input.signed_record?.id || !input.relying_party.partner_id || !input.relying_party.policy_id) {
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
      underlying: {
        verdict: "reject",
        cryptographically_authentic: false,
        currently_authorizable: false,
        phases: [
          {
            id: "malformed_input",
            status: "fail",
            detail: "Signed decision receipt or relying-party scope missing required fields.",
          },
        ],
        failure_codes: ["malformed_input"],
        checks_possible_offline: [],
        checks_requiring_live_authority: [],
        disclaimer:
          "Malformed input — verification did not run. Fix the signed record and relying-party scope before authorize.",
      },
    };
  }

  if (intent === "inspect_only") {
    const underlying = await inspectSignedDecisionReceiptCryptography({
      signed_record: input.signed_record,
      relying_party: input.relying_party,
      trust_env: input.trust_env,
      now: input.now,
      revocation_source: input.revocation_source,
    });
    const verdict = receiptVerdictFromUnderlying(underlying);
    return {
      contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
      verification_intent: "inspect_only",
      verdict,
      authorize: false,
      rejection_reasons: mapReceiptFailureCodes(underlying),
      detail_codes: Array.from(underlying.failure_codes),
      offline_checks_completed: underlying.checks_possible_offline,
      live_checks_required: underlying.checks_requiring_live_authority,
      identity_database_required: false,
      abraxas_database_trust_root_required: false,
      underlying,
    };
  }

  const storeRequirement = requireConsumptionStoreForAuthorization({
    consumption_store: input.consumption_store,
    allow_in_memory_consumption_for_tests: input.allow_in_memory_consumption_for_tests,
  });
  if (!storeRequirement.ok) {
    const underlying = verifyReceiptIndependently({
      signedRecord: input.signed_record,
      expectations: {
        partnerId: input.relying_party.partner_id,
        policyId: input.relying_party.policy_id,
        allowSandbox: input.relying_party.allow_sandbox,
      },
      now: input.now,
      env: input.trust_env,
      revocationSource: input.revocation_source,
    });
    return blockedResult({
      underlying,
      rejection_reasons: ["durable_store_required"],
      intent: "authorize",
    });
  }

  const harness = new ExternalRelyingPartyHarness({
    partnerId: input.relying_party.partner_id,
    policyId: input.relying_party.policy_id,
    allowSandbox: input.relying_party.allow_sandbox,
    env: input.trust_env,
    consumptionStore: storeRequirement.store,
  });

  const audit = await harness.decide({
    requestId: input.request_id,
    signedRecord: input.signed_record,
    now: input.now,
    revocationSource: input.revocation_source,
    singleUse: input.enforce_single_use !== false,
  });

  const underlying = audit.verifier;
  const verdict = audit.replay_detected
    ? "invalid"
    : receiptVerdictFromUnderlying(underlying);
  const rejection_reasons = audit.replay_detected
    ? (["replay_detected"] as const)
    : mapReceiptFailureCodes(underlying);

  return {
    contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
    verification_intent: "authorize",
    verdict,
    authorize: audit.outcome === "granted" && audit.authorization_verified,
    rejection_reasons: Array.from(rejection_reasons),
    detail_codes: Array.from(underlying.failure_codes),
    offline_checks_completed: underlying.checks_possible_offline,
    live_checks_required: underlying.checks_requiring_live_authority,
    identity_database_required: false,
    abraxas_database_trust_root_required: false,
    underlying,
  };
}
