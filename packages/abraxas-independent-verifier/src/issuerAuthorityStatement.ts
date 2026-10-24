import nacl from "tweetnacl";
import type {
  IssuerAuthorityKeyEntry,
  IssuerAuthorityStatementPayload,
  SignedIssuerAuthorityStatement,
} from "./types";
import { hashIssuerAuthorityPayload } from "./canonical";
import { base64UrlDecode, ed25519PublicFromJwk, verifyEd25519Detached } from "./crypto";

export type IssuerResolveMode = "current_authorization" | "signature_verification";

function inWindow(
  key: IssuerAuthorityKeyEntry,
  now: Date,
  mode: IssuerResolveMode,
): string | null {
  const nowMs = now.getTime();
  const notBefore = Date.parse(key.not_before);
  if (Number.isNaN(notBefore) || nowMs < notBefore) return "not_yet_valid";
  if (mode === "current_authorization") {
    if (key.status === "revoked") return "revoked";
    if (key.status !== "active") return "issuer_not_active";
    if (key.expires_at) {
      const exp = Date.parse(key.expires_at);
      if (!Number.isNaN(exp) && nowMs >= exp) return "issuer_expired";
    }
    return null;
  }
  if (key.status === "active") {
    if (key.expires_at) {
      const exp = Date.parse(key.expires_at);
      if (!Number.isNaN(exp) && nowMs >= exp) return "issuer_expired";
    }
    return null;
  }
  if (key.status === "retiring" || key.status === "retired" || key.status === "revoked") {
    if (!key.allow_historical_verification) return "historical_not_allowed";
    if (key.historical_verify_until) {
      const until = Date.parse(key.historical_verify_until);
      if (!Number.isNaN(until) && nowMs >= until) return "historical_window_closed";
    }
    return null;
  }
  return "revoked";
}

export function verifySignedIssuerAuthorityStatement(input: {
  statement: SignedIssuerAuthorityStatement;
  trustAnchorPublicJwk: JsonWebKey;
  minimumRegistryVersion?: number;
  now?: Date;
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
  if (!pub) return { ok: false, reason: "invalid_anchor_public_jwk" };
  const message = Buffer.from(statement.payload_hash, "hex");
  if (
    !verifyEd25519Detached({
      message,
      signatureBase64Url: statement.signature,
      publicJwk: trustAnchorPublicJwk,
    })
  ) {
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
  const issuedAt = Date.parse(statement.payload.issued_at);
  if (!Number.isNaN(issuedAt) && issuedAt > Date.now() + 60_000) {
    return { ok: false, reason: "statement_issued_in_future" };
  }
  return { ok: true };
}

export function resolveIssuerKeyFromSignedStatement(input: {
  statement: SignedIssuerAuthorityStatement;
  trustAnchorPublicJwk: JsonWebKey;
  keyId: string;
  schemaVersion: string;
  environment: "demo" | "production";
  mode: IssuerResolveMode;
  now?: Date;
  minimumRegistryVersion?: number;
}):
  | { ok: true; key: IssuerAuthorityKeyEntry; registry_version: number }
  | { ok: false; reason: string } {
  const verified = verifySignedIssuerAuthorityStatement({
    statement: input.statement,
    trustAnchorPublicJwk: input.trustAnchorPublicJwk,
    minimumRegistryVersion: input.minimumRegistryVersion,
    now: input.now,
  });
  if (!verified.ok) return verified;

  const payload = input.statement.payload;
  if (payload.environment !== input.environment) {
    return { ok: false, reason: "wrong_environment" };
  }
  const key = payload.keys.find((k) => k.key_id === input.keyId);
  if (!key) return { ok: false, reason: "unknown_key" };
  if (key.environment !== input.environment) return { ok: false, reason: "wrong_environment" };
  if (!key.schema_versions.includes(input.schemaVersion)) {
    return { ok: false, reason: "schema_mismatch" };
  }
  const windowReason = inWindow(key, input.now ?? new Date(), input.mode);
  if (windowReason) return { ok: false, reason: windowReason };
  return { ok: true, key, registry_version: payload.registry_version };
}

export function signIssuerAuthorityPayloadForTests(input: {
  payload: IssuerAuthorityStatementPayload;
  anchorPrivateJwk: JsonWebKey;
}): SignedIssuerAuthorityStatement {
  if (!input.anchorPrivateJwk.d) throw new Error("anchor_private_jwk_required");
  const payloadHash = hashIssuerAuthorityPayload(input.payload);
  const seed = base64UrlDecode(input.anchorPrivateJwk.d);
  const keyPair = nacl.sign.keyPair.fromSeed(seed);
  const message = Buffer.from(payloadHash, "hex");
  const signature = nacl.sign.detached(message, keyPair.secretKey);
  return {
    payload: input.payload,
    payload_hash: payloadHash,
    signature: Buffer.from(signature).toString("base64url"),
    anchor_key_id: input.payload.anchor_key_id,
  };
}
