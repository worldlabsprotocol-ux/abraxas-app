// FILE: lib/persistence/boundary/issuerAuthority/signVerify.ts

import nacl from "tweetnacl";
import type { SignedIssuerAuthorityStatement, IssuerAuthorityStatementPayload } from "./contract";
import { hashIssuerAuthorityPayload } from "./canonical";

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Uint8Array.from(Buffer.from(padded + pad, "base64"));
}

function ed25519PublicFromJwk(jwk: JsonWebKey): Uint8Array {
  if (!jwk.x) throw new Error("invalid_anchor_public_jwk");
  const bytes = base64UrlDecode(jwk.x);
  if (bytes.length !== 32) throw new Error("invalid_anchor_public_jwk_length");
  return bytes;
}

export function signIssuerAuthorityPayload(
  payload: IssuerAuthorityStatementPayload,
  anchorPrivateJwk: JsonWebKey,
): SignedIssuerAuthorityStatement {
  if (!anchorPrivateJwk.d) throw new Error("anchor_private_jwk_required");
  const payloadHash = hashIssuerAuthorityPayload(payload);
  const seed = base64UrlDecode(anchorPrivateJwk.d);
  const keyPair = nacl.sign.keyPair.fromSeed(seed);
  const message = Buffer.from(payloadHash, "hex");
  const signature = nacl.sign.detached(message, keyPair.secretKey);
  return {
    payload,
    payload_hash: payloadHash,
    signature: Buffer.from(signature).toString("base64url"),
    anchor_key_id: payload.anchor_key_id,
  };
}

export function verifySignedIssuerAuthorityStatement(input: {
  statement: SignedIssuerAuthorityStatement;
  trustAnchorPublicJwk: JsonWebKey;
  minimumRegistryVersion?: number;
}): { ok: true } | { ok: false; reason: string } {
  const { statement, trustAnchorPublicJwk } = input;
  const expectedHash = hashIssuerAuthorityPayload(statement.payload);
  if (expectedHash !== statement.payload_hash) {
    return { ok: false, reason: "statement_payload_hash_mismatch" };
  }
  if (statement.anchor_key_id !== statement.payload.anchor_key_id) {
    return { ok: false, reason: "anchor_key_id_mismatch" };
  }
  const pub = ed25519PublicFromJwk(trustAnchorPublicJwk);
  const message = Buffer.from(statement.payload_hash, "hex");
  const sig = base64UrlDecode(statement.signature);
  if (!nacl.sign.detached.verify(message, sig, pub)) {
    return { ok: false, reason: "statement_signature_invalid" };
  }
  const min = input.minimumRegistryVersion;
  if (min != null && statement.payload.registry_version < min) {
    return { ok: false, reason: "registry_version_rollback_rejected" };
  }
  if (
    statement.payload.supersedes_registry_version != null
    && statement.payload.registry_version <= statement.payload.supersedes_registry_version
  ) {
    return { ok: false, reason: "registry_version_not_advanced" };
  }
  return { ok: true };
}
