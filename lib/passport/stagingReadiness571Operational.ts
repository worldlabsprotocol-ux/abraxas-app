// FILE: lib/passport/stagingReadiness571Operational.ts
// Read-only operational probes for staging readiness (no server-only imports).

import { accessSync, constants } from "node:fs";
import { loadReceiptVerificationRegistry } from "@/lib/decisionReceipts/verificationKeyLifecycle/registry";
import { publicReceiptJwkFingerprint, toPublicReceiptJwk } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import { loadPassportCredentialIssuerRegistry } from "./reusableCredential/credentialIssuerRegistry";
import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";
import type { PortableRevocationBootstrapTrust } from "@/lib/protocol/portableRevocation";

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

export function portableSnapshotMatchesBootstrapTrust(input: {
  snapshot: PortableRevocationSignedArtifact;
  bootstrapTrusts: PortableRevocationBootstrapTrust[];
}): boolean {
  const payloadHash = input.snapshot.payload_hash?.trim();
  const sequence = input.snapshot.payload?.snapshot_sequence;
  const issuerId = input.snapshot.payload?.issuer_id?.trim();
  if (!payloadHash || typeof sequence !== "number" || !issuerId) return false;
  return input.bootstrapTrusts.some(
    (trust) =>
      trust.revocation_issuer_id === issuerId
      && trust.snapshot_sequence === sequence
      && trust.trusted_payload_hash === payloadHash,
  );
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
