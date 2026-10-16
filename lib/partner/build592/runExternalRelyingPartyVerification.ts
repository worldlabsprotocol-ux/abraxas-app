// FILE: lib/partner/build592/runExternalRelyingPartyVerification.ts

import { readFileSync } from "node:fs";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { RevocationSourceState } from "@/lib/institutionalCertification/build546/independentVerifier";
import { FileReceiptConsumptionStore } from "@/lib/institutionalCertification/build547/receiptConsumptionStore";
import {
  resolveInstitutionalTrustEnv,
  verifySignedDecisionReceipt,
} from "@/lib/institutionalVerification";
import {
  buildExternalVerificationProofRecord,
  type ExternalVerificationExecutionEnvironment,
  type ExternalVerificationProofRecord,
} from "@/lib/partner/build592/externalVerificationProof";

export type InstitutionRevocationFeedEnvelope = RevocationSourceState & {
  observed_at?: string;
};

export function loadInstitutionOperatedRevocationFeed(env: NodeJS.ProcessEnv): {
  ok: true;
  state: RevocationSourceState;
} | {
  ok: false;
  code: "adapter_required" | "feed_missing" | "freshness_config_missing" | "stale_feed" | "invalid_feed";
} {
  if (env.RP_REVOCATION_ADAPTER?.trim() !== "institution_operated") {
    return { ok: false, code: "adapter_required" };
  }
  const inline = env.RP_REVOCATION_FEED_JSON?.trim();
  const path = env.RP_REVOCATION_FEED_PATH?.trim();
  const raw = inline ?? (path ? readFileSync(path, "utf8") : "");
  if (!raw) return { ok: false, code: "feed_missing" };
  let parsed: InstitutionRevocationFeedEnvelope;
  try {
    parsed = JSON.parse(raw) as InstitutionRevocationFeedEnvelope;
  } catch {
    return { ok: false, code: "invalid_feed" };
  }
  const maxAgeRaw = env.RP_REVOCATION_FEED_MAX_AGE_SECONDS?.trim();
  const maxAge = maxAgeRaw ? Number(maxAgeRaw) : NaN;
  if (!Number.isFinite(maxAge) || maxAge <= 0) {
    return { ok: false, code: "freshness_config_missing" };
  }
  const observedAtRaw =
    (typeof parsed.observed_at === "string" && parsed.observed_at.trim())
    || env.RP_REVOCATION_FEED_OBSERVED_AT?.trim()
    || "";
  const observedAt = observedAtRaw ? Date.parse(observedAtRaw) : NaN;
  if (!Number.isFinite(observedAt)) {
    return { ok: false, code: "freshness_config_missing" };
  }
  if (Date.now() - observedAt > maxAge * 1000) {
    return { ok: false, code: "stale_feed" };
  }
  const { observed_at: _ignored, ...state } = parsed;
  return { ok: true, state: state as RevocationSourceState };
}

export async function runExternalRelyingPartyVerification(input: {
  signedRecord: DecisionReceiptRecord;
  partnerId: string;
  policyId: string;
  requestId: string;
  trustEnv: Record<string, string | undefined>;
  consumptionStoreDir: string;
  revocationSource: RevocationSourceState;
  executionEnvironment: ExternalVerificationExecutionEnvironment;
  sandbox: ExternalVerificationProofRecord["sandbox"];
  trustDigestPin: string | null;
  now?: Date;
}): Promise<ExternalVerificationProofRecord> {
  const store = new FileReceiptConsumptionStore(input.consumptionStoreDir);
  const result = await verifySignedDecisionReceipt({
    signed_record: input.signedRecord,
    relying_party: { partner_id: input.partnerId, policy_id: input.policyId },
    request_id: input.requestId,
    trust_env: input.trustEnv,
    consumption_store: store,
    revocation_source: input.revocationSource,
    now: input.now,
  });

  const replayDetected = result.rejection_reasons.includes("replay_detected");
  const consumed = result.authorize === true && !replayDetected;

  return buildExternalVerificationProofRecord({
    result,
    verifiedAt: new Date().toISOString(),
    executionEnvironment: input.executionEnvironment,
    sandbox: input.sandbox,
    receiptId: input.signedRecord.id,
    requestId: input.requestId,
    trustDigestPin: input.trustDigestPin,
    sdkPackage: "@abraxas/institutional-verification",
    evidenceSource: "lib/partner/build592/runExternalRelyingPartyVerification.ts",
    operatorCommand: "npm run build-592:sandbox-external-evidence",
    durableConsumptionRecorded: consumed,
    replayDetected,
  });
}

export function loadSignedReceiptFromPath(path: string): DecisionReceiptRecord {
  return JSON.parse(readFileSync(path, "utf8")) as DecisionReceiptRecord;
}

export async function resolveTrustEnvFromProcess(env: NodeJS.ProcessEnv) {
  const registryJson = env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY?.trim();
  const registryPath = env.BUILD592_TRUST_REGISTRY_PATH?.trim();
  const registry = registryJson ?? (registryPath ? readFileSync(registryPath, "utf8") : undefined);
  return resolveInstitutionalTrustEnv({
    receipt_verification_registry_json: registry,
    trust_origin_url: env.ABRAXAS_TRUST_ORIGIN,
    pinned_receipt_key_document_digest: env.ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST,
  });
}
