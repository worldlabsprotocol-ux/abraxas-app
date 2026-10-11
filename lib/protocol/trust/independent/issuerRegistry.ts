// Map public verification-key documents to issuer authorization snapshots (no Supabase).

import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import type { ReceiptVerificationKeyRecord } from "@/lib/decisionReceipts/verificationKeyLifecycle/contract";
import { loadReceiptVerificationRegistry } from "@/lib/decisionReceipts/verificationKeyLifecycle/registry";
import type { IssuerRegistrySnapshot } from "@/lib/protocol/trust/chainAssuranceVerifier";
import { resolveVerificationKey } from "@/lib/decisionReceipts/verificationKeyLifecycle/resolve";

export function loadTrustRegistryFromPublicKeys(
  keys: ReceiptVerificationKeyRecord[],
  runtimeEnvironment: "demo" | "production" = "demo",
): ReturnType<typeof loadReceiptVerificationRegistry> {
  return loadReceiptVerificationRegistry({
    ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify(keys),
    ABRAXAS_RUNTIME_ENV: runtimeEnvironment,
  });
}

export function issuerRegistrySnapshotFromKeys(keys: ReceiptVerificationKeyRecord[]): IssuerRegistrySnapshot {
  const authorized = keys
    .filter((k) => k.status === "active" || k.status === "retiring" || k.status === "retired")
    .map((k) => k.key_id);
  const revoked = keys.filter((k) => k.status === "revoked").map((k) => k.key_id);
  return {
    authorized_signer_key_ids: authorized,
    revoked_signer_key_ids: revoked,
  };
}

export function resolveIssuerPublicKey(input: {
  keyId: string;
  schemaVersion?: string;
  keys: ReceiptVerificationKeyRecord[];
  now?: Date;
  runtimeEnvironment?: "demo" | "production";
}) {
  const env: Record<string, string | undefined> = {
    ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify(input.keys),
    ABRAXAS_RUNTIME_ENV: input.runtimeEnvironment ?? "demo",
  };
  return resolveVerificationKey({
    keyId: input.keyId,
    schemaVersion: input.schemaVersion ?? DECISION_RECEIPT_SCHEMA_VERSION,
    now: input.now,
    env,
    runtimeEnvironment: input.runtimeEnvironment ?? "demo",
  });
}
