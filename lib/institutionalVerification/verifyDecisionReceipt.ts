// FILE: lib/institutionalVerification/verifyDecisionReceipt.ts

import { verifyReceiptIndependently } from "@/lib/institutionalCertification/build546/independentVerifier";
import { ExternalRelyingPartyHarness } from "@/lib/institutionalCertification/build546/externalRelyingParty";
import { InMemoryReceiptConsumptionStore } from "@/lib/institutionalCertification/build547/receiptConsumptionStore";
import type {
  InstitutionalReceiptVerificationResult,
  VerifySignedDecisionReceiptInput,
} from "./contract";
import { INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION } from "./contract";
import {
  mapReceiptFailureCodes,
  receiptVerdictFromUnderlying,
} from "./reasonMapping";

export async function verifySignedDecisionReceipt(
  input: VerifySignedDecisionReceiptInput,
): Promise<InstitutionalReceiptVerificationResult> {
  if (!input.signed_record?.id || !input.relying_party.partner_id || !input.relying_party.policy_id) {
    const underlying = verifyReceiptIndependently({
      signedRecord: input.signed_record,
      expectations: {
        partnerId: input.relying_party.partner_id ?? "",
        policyId: input.relying_party.policy_id ?? "",
      },
      now: input.now,
      env: input.trust_env,
    });
    return {
      contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
      verdict: "invalid",
      authorize: false,
      rejection_reasons: ["malformed_input"],
      detail_codes: ["malformed_input"],
      offline_checks_completed: underlying.checks_possible_offline,
      live_checks_required: underlying.checks_requiring_live_authority,
      identity_database_required: false,
      abraxas_database_trust_root_required: false,
      underlying,
    };
  }

  const harness = new ExternalRelyingPartyHarness({
    partnerId: input.relying_party.partner_id,
    policyId: input.relying_party.policy_id,
    allowSandbox: input.relying_party.allow_sandbox,
    env: input.trust_env,
    consumptionStore: input.consumption_store ?? new InMemoryReceiptConsumptionStore(),
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
