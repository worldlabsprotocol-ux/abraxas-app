// FILE: lib/passport/stagingReadiness571Operational.ts
// Read-only operational probes for staging readiness (no server-only imports).

import { accessSync, constants } from "node:fs";
import { loadReceiptVerificationRegistry } from "@/lib/decisionReceipts/verificationKeyLifecycle/registry";
import { publicReceiptJwkFingerprint, toPublicReceiptJwk } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import {
  InMemoryPortableRevocationCheckpointStore,
  verifyPortableRevocationAtRelyingParty,
  type PortableRevocationSignedArtifact,
} from "@/lib/protocol/portableRevocation";
import type { PortableRevocationBootstrapTrust } from "@/lib/protocol/portableRevocation";
import type { PortableRevocationIssuerTrustPolicy } from "@/lib/protocol/portableRevocation/issuerAuthority";
import { loadPassportCredentialIssuerRegistry } from "./reusableCredential/credentialIssuerRegistry";

export function credentialPublicKeyMatchesRegistry(input: {
  signingKeyId: string;
  publicKeyJwk: JsonWebKey;
  env: Record<string, string | undefined>;
}): boolean {
  const registry = loadPassportCredentialIssuerRegistry(input.env);
  const entry = registry.find((row) => row.signing_key_id === input.signingKeyId);
  if (!entry?.public_jwk?.x) return false;
  return entry.public_jwk.x === input.publicKeyJwk.x && entry.public_jwk.crv === input.publicKeyJwk.crv;
}

export function receiptPublicKeyMatchesRegistry(input: {
  signingKeyId: string;
  publicKeyJwk: JsonWebKey;
  env: Record<string, string | undefined>;
}): boolean {
  const loaded = loadReceiptVerificationRegistry(input.env);
  if (!loaded.ok) return false;
  const entry = loaded.keys.find((key) => key.key_id === input.signingKeyId);
  if (!entry) return false;
  const publicJwk = toPublicReceiptJwk(input.publicKeyJwk);
  if (!publicJwk) return false;
  return publicReceiptJwkFingerprint(entry.public_jwk) === publicReceiptJwkFingerprint(publicJwk);
}

export function directoryReadWriteAccessible(path: string): boolean {
  try {
    accessSync(path, constants.R_OK | constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export async function probePortableRevocationPublisher(input: {
  publisherUrl: string;
  statusId: string;
}): Promise<{ ok: true; snapshot: PortableRevocationSignedArtifact } | { ok: false; code: string }> {
  const url = `${input.publisherUrl.replace(/\/$/, "")}/status/${encodeURIComponent(input.statusId)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { ok: false, code: "publisher_fetch_failed" };
    const snapshot = (await res.json()) as PortableRevocationSignedArtifact;
    if (!snapshot?.payload_hash || !snapshot?.payload) return { ok: false, code: "publisher_snapshot_invalid" };
    return { ok: true, snapshot };
  } catch {
    return { ok: false, code: "publisher_unreachable" };
  }
}

export type StrictPublisherSnapshotAuditResult =
  | { ok: true }
  | { ok: false; code: string }
  | { ok: false; limited: true; code: string; detail: string };

function minimalProbeReceipt(receiptId: string, signingKeyId: string): DecisionReceiptRecord {
  return {
    id: receiptId,
    signing_key_id: signingKeyId,
    partner_id: "staging-probe",
    policy_id: "staging-probe",
    policy_version: 1,
    verification_decision_id: "00000000-0000-4000-8000-000000000571",
    subject_pseudonym_id: "staging-probe-subject",
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: ["staging_probe"],
    evaluated_claim_refs: [],
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
    schema_version: "1.0.0",
  } as unknown as DecisionReceiptRecord;
}

/** Strict RP verification using institution-configured trust only (never bootstrap from artifact). */
export async function auditPortableRevocationPublisherSnapshot(input: {
  artifact: PortableRevocationSignedArtifact;
  env: Record<string, string | undefined>;
  issuerTrust: PortableRevocationIssuerTrustPolicy | null;
  bootstrapTrusts: PortableRevocationBootstrapTrust[];
  probeReceiptId?: string;
  now?: Date;
}): Promise<StrictPublisherSnapshotAuditResult> {
  if (!input.issuerTrust?.bindings?.length) {
    return {
      ok: false,
      limited: true,
      code: "issuer_trust_unconfigured",
      detail: "Strict publisher verification requires configured portable revocation issuer trust.",
    };
  }
  if (!input.bootstrapTrusts.length) {
    return {
      ok: false,
      limited: true,
      code: "bootstrap_trusts_unconfigured",
      detail: "Strict publisher verification requires founder-provisioned bootstrap trusts.",
    };
  }
  if (!input.probeReceiptId?.trim()) {
    return {
      ok: false,
      limited: true,
      code: "probe_receipt_unconfigured",
      detail: "Set ABRAXAS_STAGING_REVOCATION_PROBE_RECEIPT_ID to a receipt present in the probe snapshot.",
    };
  }

  const binding = input.issuerTrust.bindings.find(
    (row) => row.revocation_issuer_id === input.artifact.payload.issuer_id,
  );
  if (!binding) {
    return { ok: false, code: "issuer_authority_mismatch" };
  }

  const receipt = minimalProbeReceipt(input.probeReceiptId.trim(), binding.receipt_signing_key_id);
  const checkpointStore = new InMemoryPortableRevocationCheckpointStore();
  const result = await verifyPortableRevocationAtRelyingParty({
    artifact: input.artifact,
    receipt,
    env: input.env,
    issuerTrust: input.issuerTrust,
    checkpointStore,
    bootstrapTrusts: input.bootstrapTrusts,
    advanceCheckpointOnSuccess: false,
    now: input.now,
  });

  if (result.verification.ok) {
    return { ok: true };
  }
  return { ok: false, code: result.verification.codes[0] ?? "publisher_strict_verify_failed" };
}
