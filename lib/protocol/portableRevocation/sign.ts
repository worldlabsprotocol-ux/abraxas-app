// FILE: lib/protocol/portableRevocation/sign.ts

import nacl from "tweetnacl";
import type { ReceiptSigningKeyPair } from "@/lib/decisionReceipts/signing";
import {
  PORTABLE_REVOCATION_MEDIA_TYPE,
  PORTABLE_REVOCATION_SCHEMA_VERSION,
  type PortableRevocationPayload,
  type PortableRevocationSignedArtifact,
  type PortableRevocationStatusEntry,
} from "./contract";
import { hashPortableRevocationPayload } from "./canonical";
import { portableRevocationStatusId } from "./statusId";

function base64UrlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Uint8Array.from(Buffer.from(padded + pad, "base64"));
}

function ed25519SignPayloadHash(payloadHashHex: string, privateJwk: JsonWebKey): string {
  if (!privateJwk.d) throw new Error("missing_private_key");
  const seed = base64UrlDecode(privateJwk.d);
  const keyPair = nacl.sign.keyPair.fromSeed(seed);
  const message = Buffer.from(payloadHashHex, "hex");
  return base64UrlEncode(nacl.sign.detached(message, keyPair.secretKey));
}

export function buildPortableRevocationPayload(input: {
  issuerId: string;
  signingKeyId: string;
  snapshotSequence: number;
  issuedAt: string;
  expiresAt: string;
  maxFreshnessSeconds: number;
  previousSnapshotHash: string | null;
  receiptStates: Array<{ receiptId: string; state: "active" | "revoked"; updatedAt: string }>;
}): PortableRevocationPayload {
  const status_entries: PortableRevocationStatusEntry[] = input.receiptStates
    .map((row) => ({
      status_id: portableRevocationStatusId(row.receiptId, input.issuerId),
      state: row.state,
      updated_at: row.updatedAt,
    }))
    .sort((a, b) => a.status_id.localeCompare(b.status_id));

  return {
    schema_version: PORTABLE_REVOCATION_SCHEMA_VERSION,
    issuer_id: input.issuerId,
    signing_key_id: input.signingKeyId,
    snapshot_sequence: input.snapshotSequence,
    issued_at: input.issuedAt,
    expires_at: input.expiresAt,
    max_freshness_seconds: input.maxFreshnessSeconds,
    previous_snapshot_hash: input.previousSnapshotHash,
    status_entries,
  };
}

export function signPortableRevocationSnapshot(input: {
  payload: PortableRevocationPayload;
  signingKey: ReceiptSigningKeyPair;
}): PortableRevocationSignedArtifact {
  const payload_hash = hashPortableRevocationPayload(input.payload);
  const signature = ed25519SignPayloadHash(payload_hash, input.signingKey.privateKeyJwk);
  return {
    media_type: PORTABLE_REVOCATION_MEDIA_TYPE,
    payload: input.payload,
    payload_hash,
    signature,
  };
}

export function verifyPortableRevocationSignature(input: {
  artifact: PortableRevocationSignedArtifact;
  publicKeyJwk: JsonWebKey;
}): boolean {
  if (!input.publicKeyJwk.x) return false;
  const expectedHash = hashPortableRevocationPayload(input.artifact.payload);
  if (expectedHash !== input.artifact.payload_hash) return false;
  const pubKey = base64UrlDecode(input.publicKeyJwk.x);
  let sig: Uint8Array;
  try {
    sig = base64UrlDecode(input.artifact.signature);
  } catch {
    return false;
  }
  if (sig.length !== nacl.sign.signatureLength) {
    return false;
  }
  const message = Buffer.from(input.artifact.payload_hash, "hex");
  return nacl.sign.detached.verify(message, sig, pubKey);
}
