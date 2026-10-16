// FILE: lib/partner/build592/runExternalRelyingPartyVerification.ts

import { readFileSync } from "node:fs";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { RevocationSourceState } from "@/lib/institutionalCertification/build546/independentVerifier";
import { FileReceiptConsumptionStore } from "@/lib/institutionalCertification/build547/receiptConsumptionStore";
import {
  resolveInstitutionalTrustEnv,
  verifyHolderTrustPresentation,
  verifySignedDecisionReceipt,
} from "@/lib/institutionalVerification";
import { composeHolderPolicyScopedPresentation } from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import {
  InMemoryPortableRevocationCheckpointStore,
  type PortableRevocationBootstrapTrust,
  type PortableRevocationIssuerTrustPolicy,
  type PortableRevocationSignedArtifact,
} from "@/lib/protocol/portableRevocation";
import {
  buildExternalVerificationProofRecord,
  type ExternalVerificationEvidenceMode,
  type ExternalVerificationExecutionEnvironment,
  type ExternalVerificationProofRecord,
  type ReceiptProvenance,
} from "@/lib/partner/build592/externalVerificationProof";
import { validateReceiptSandboxScope } from "@/lib/partner/build592/receiptScopeValidation";

const TEST_MEMORY = { allow_in_memory_consumption_for_tests: true as const };

export async function resolveProductionTrustEnvFromProcess(env: NodeJS.ProcessEnv) {
  const registryJson = env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY?.trim();
  const registryPath = env.BUILD592_TRUST_REGISTRY_PATH?.trim();
  const registry = registryJson ?? (registryPath ? readFileSync(registryPath, "utf8") : undefined);
  const digestPin = env.ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST?.trim() ?? null;
  const trustOrigin = env.ABRAXAS_TRUST_ORIGIN?.trim();

  if (trustOrigin && !registry && !digestPin) {
    return { ok: false as const, code: "pin_required" as const };
  }

  return resolveInstitutionalTrustEnv({
    receipt_verification_registry_json: registry,
    trust_origin_url: registry ? undefined : trustOrigin,
    pinned_receipt_key_document_digest: digestPin ?? undefined,
    portable_revocation_issuer_trust_json: env.BUILD592_PORTABLE_REVOCATION_ISSUER_TRUST_JSON
      ?? env.ABRAXAS_PORTABLE_REVOCATION_ISSUER_TRUST,
    portable_revocation_bootstrap_trusts_json: env.BUILD592_PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_JSON,
  });
}

export function loadSignedReceiptFromPath(path: string): DecisionReceiptRecord {
  return JSON.parse(readFileSync(path, "utf8")) as DecisionReceiptRecord;
}

export async function runProductionExternalVerification(input: {
  signedRecord: DecisionReceiptRecord;
  partnerId: string;
  policyId: string;
  requestId: string;
  trustEnv: Record<string, string | undefined>;
  trustDigestPin: string | null;
  consumptionStoreDir: string;
  portableRevocationSnapshot: PortableRevocationSignedArtifact;
  portableRevocationIssuerTrust: PortableRevocationIssuerTrustPolicy;
  portableRevocationBootstrapTrusts: PortableRevocationBootstrapTrust[];
  executionEnvironment: ExternalVerificationExecutionEnvironment;
  receiptProvenance: ReceiptProvenance;
  sandbox: ExternalVerificationProofRecord["sandbox"];
  expectedApplicationId?: string | null;
  now?: Date;
}): Promise<
  | { ok: true; proof: ExternalVerificationProofRecord }
  | { ok: false; code: string; detail?: string }
> {
  const scope = validateReceiptSandboxScope({
    signedRecord: input.signedRecord,
    expectedPartnerId: input.partnerId,
    expectedPolicyId: input.policyId,
    expectedEnvironment: input.sandbox.environment,
    expectedApplicationId: input.expectedApplicationId,
  });
  if (!scope.ok) {
    return { ok: false, code: scope.code };
  }
  if (!input.trustDigestPin?.trim()) {
    return { ok: false, code: "trust_digest_pin_required" };
  }

  const presentation = composeHolderPolicyScopedPresentation({
    signedRecord: input.signedRecord,
    audiencePartnerId: input.partnerId,
  });
  const store = new FileReceiptConsumptionStore(input.consumptionStoreDir);
  const checkpointStore = new InMemoryPortableRevocationCheckpointStore();

  const result = await verifyHolderTrustPresentation({
    presentation,
    relying_party: { partner_id: input.partnerId, policy_id: input.policyId, allow_sandbox: true },
    request_id: input.requestId,
    trust_env: input.trustEnv,
    portable_revocation_snapshot: input.portableRevocationSnapshot,
    portable_revocation_issuer_trust: input.portableRevocationIssuerTrust,
    portable_revocation_bootstrap_trusts: input.portableRevocationBootstrapTrusts,
    checkpoint_store: checkpointStore,
    consumption_store: store,
    now: input.now,
  });

  const replayDetected = result.replay_detected || result.rejection_reasons.includes("replay_detected");
  const consumed = result.authorize === true && !replayDetected;

  const proof = buildExternalVerificationProofRecord({
    presentationResult: result,
    verifiedAt: new Date().toISOString(),
    executionEnvironment: input.executionEnvironment,
    evidenceMode: "production_portable_revocation",
    receiptProvenance: input.receiptProvenance,
    sandbox: input.sandbox,
    receiptId: input.signedRecord.id,
    requestId: input.requestId,
    trustDigestPin: input.trustDigestPin,
    sdkPackage: "@abraxas/institutional-verification",
    evidenceSource: "verifyHolderTrustPresentation + portable_revocation_snapshot",
    operatorCommand: "npm run build-592:sandbox-external-evidence",
    durableConsumptionRecorded: consumed,
    replayDetected,
    portableRevocationAuthenticated: result.portable_revocation_authenticated === true,
    revocationMechanism: "portable_revocation_snapshot",
  });

  return { ok: true, proof };
}

/** Isolated fixture path — lightweight revocation status; not production acceptance. */
export async function runIsolatedFixtureExternalVerification(input: {
  signedRecord: DecisionReceiptRecord;
  partnerId: string;
  policyId: string;
  requestId: string;
  trustEnv: Record<string, string | undefined>;
  consumptionStoreDir: string;
  revocationSource: RevocationSourceState;
  portableRevocationSnapshot: PortableRevocationSignedArtifact;
  portableRevocationIssuerTrust: PortableRevocationIssuerTrustPolicy;
  portableRevocationBootstrapTrusts: PortableRevocationBootstrapTrust[];
  executionEnvironment: ExternalVerificationExecutionEnvironment;
  trustDigestPin: string | null;
  now?: Date;
}): Promise<ExternalVerificationProofRecord> {
  const presentation = composeHolderPolicyScopedPresentation({
    signedRecord: input.signedRecord,
    audiencePartnerId: input.partnerId,
  });
  const store = new FileReceiptConsumptionStore(input.consumptionStoreDir);
  const checkpointStore = new InMemoryPortableRevocationCheckpointStore();

  const result = await verifyHolderTrustPresentation({
    presentation,
    relying_party: { partner_id: input.partnerId, policy_id: input.policyId, allow_sandbox: true },
    request_id: input.requestId,
    trust_env: input.trustEnv,
    portable_revocation_snapshot: input.portableRevocationSnapshot,
    portable_revocation_issuer_trust: input.portableRevocationIssuerTrust,
    portable_revocation_bootstrap_trusts: input.portableRevocationBootstrapTrusts,
    checkpoint_store: checkpointStore,
    consumption_store: store,
    now: input.now,
    ...TEST_MEMORY,
  });

  const replayDetected = result.replay_detected || result.rejection_reasons.includes("replay_detected");
  const consumed = result.authorize === true && !replayDetected;

  return buildExternalVerificationProofRecord({
    presentationResult: result,
    verifiedAt: new Date().toISOString(),
    executionEnvironment: input.executionEnvironment,
    evidenceMode: "isolated_sdk_fixture",
    receiptProvenance: "operator_supplied_file",
    sandbox: {
      application_id: null,
      public_slug: null,
      partner_id: input.partnerId,
      policy_id: input.policyId,
      policy_version: input.signedRecord.policy_version ?? null,
      environment: "sandbox",
    },
    receiptId: input.signedRecord.id,
    requestId: input.requestId,
    trustDigestPin: input.trustDigestPin,
    sdkPackage: "@abraxas/institutional-verification",
    evidenceSource: "isolated_sdk_fixture",
    operatorCommand: "vitest",
    durableConsumptionRecorded: consumed,
    replayDetected,
    portableRevocationAuthenticated: result.portable_revocation_authenticated === true,
    revocationMechanism: "portable_revocation_snapshot",
  });
}

/** Proves unsigned lightweight { status: active } cannot satisfy production authorization. */
export async function runLightweightRevocationFixtureProbe(input: {
  signedRecord: DecisionReceiptRecord;
  partnerId: string;
  policyId: string;
  requestId: string;
  trustEnv: Record<string, string | undefined>;
  consumptionStoreDir: string;
  now?: Date;
}): Promise<{ authorize: boolean; rejection_reasons: string[] }> {
  const store = new FileReceiptConsumptionStore(input.consumptionStoreDir);
  const result = await verifySignedDecisionReceipt({
    signed_record: input.signedRecord,
    relying_party: { partner_id: input.partnerId, policy_id: input.policyId, allow_sandbox: true },
    request_id: input.requestId,
    trust_env: input.trustEnv,
    consumption_store: store,
    revocation_source: { available: true, status: "active" },
    now: input.now,
    ...TEST_MEMORY,
  });
  return { authorize: result.authorize, rejection_reasons: result.rejection_reasons };
}
