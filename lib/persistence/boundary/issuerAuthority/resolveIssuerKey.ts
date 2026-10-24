// FILE: lib/persistence/boundary/issuerAuthority/resolveIssuerKey.ts

import type { IssuerAuthorityKeyEntry, SignedIssuerAuthorityStatement } from "./contract";
import { verifySignedIssuerAuthorityStatement } from "./signVerify";

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
