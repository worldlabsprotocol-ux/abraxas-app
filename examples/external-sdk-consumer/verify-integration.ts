/**
 * Clean-room TypeScript contract check — compiled in a standalone project with only the packed SDK.
 */
import type {
  DecisionReceiptRecord,
  InstitutionalReceiptVerificationResult,
  InstitutionalTrustEnvResult,
  RevocationSourceState,
  RelyingPartyScope,
} from "@abraxas/institutional-verification";
import type {
  ConsumptionAttemptResult,
  ReceiptConsumptionStore,
} from "@abraxas/institutional-verification/consumption";
import {
  inspectSignedDecisionReceipt,
  resolveInstitutionalTrustEnv,
  RECEIPT_TRUST_DIGEST_VERSION,
} from "@abraxas/institutional-verification";
import { FileReceiptConsumptionStore } from "@abraxas/institutional-verification/consumption";
import {
  loadSyntheticSignedReceipt,
  loadSyntheticTrustRegistryJson,
  SYNTHETIC_PARTNER_ID,
  SYNTHETIC_POLICY_ID,
} from "@abraxas/institutional-verification/fixtures/synthetic";

export type VerifierIntegrationShape = {
  trust: InstitutionalTrustEnvResult;
  scope: RelyingPartyScope;
  receipt: DecisionReceiptRecord;
  revocation: RevocationSourceState;
  store: ReceiptConsumptionStore;
  inspect: InstitutionalReceiptVerificationResult;
  digestVersion: typeof RECEIPT_TRUST_DIGEST_VERSION;
  consumptionSample: ConsumptionAttemptResult;
};

export async function buildVerifierIntegration(): Promise<VerifierIntegrationShape> {
  const trust = await resolveInstitutionalTrustEnv({
    receipt_verification_registry_json: loadSyntheticTrustRegistryJson(),
  });
  if (!trust.ok) throw new Error(trust.code);

  const receipt = loadSyntheticSignedReceipt() as DecisionReceiptRecord;
  const scope: RelyingPartyScope = {
    partner_id: SYNTHETIC_PARTNER_ID,
    policy_id: SYNTHETIC_POLICY_ID,
  };
  const revocation: RevocationSourceState = { available: true, status: "active" };
  const store = new FileReceiptConsumptionStore("/tmp/abraxas-ts-contract-unused");
  const inspect = await inspectSignedDecisionReceipt({
    signed_record: receipt,
    relying_party: scope,
    request_id: "ts_contract_inspect",
    trust_env: trust.env,
  });
  const consumptionSample: ConsumptionAttemptResult = await store.tryRecordConsumption({
    receiptId: "unused",
    requestId: "unused",
    partnerId: SYNTHETIC_PARTNER_ID,
    policyId: SYNTHETIC_POLICY_ID,
    at: new Date().toISOString(),
  });

  return {
    trust,
    scope,
    receipt,
    revocation,
    store,
    inspect,
    digestVersion: RECEIPT_TRUST_DIGEST_VERSION,
    consumptionSample,
  };
}
