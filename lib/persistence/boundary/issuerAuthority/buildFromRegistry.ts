// FILE: lib/persistence/boundary/issuerAuthority/buildFromRegistry.ts

import { loadReceiptVerificationRegistry } from "@/lib/decisionReceipts/verificationKeyLifecycle/registry";
import type { ReceiptVerificationKeyRecord } from "@/lib/decisionReceipts/verificationKeyLifecycle/contract";
import type { IssuerAuthorityKeyEntry, IssuerAuthorityStatementPayload } from "./contract";
import type { SignedIssuerAuthorityStatement } from "./contract";
import { signIssuerAuthorityPayload } from "./signVerify";

function toEntry(key: ReceiptVerificationKeyRecord): IssuerAuthorityKeyEntry {
  return {
    key_id: key.key_id,
    environment: key.environment,
    status: key.status,
    not_before: key.not_before,
    expires_at: key.expires_at,
    public_jwk: key.public_jwk as JsonWebKey,
    schema_versions: key.schema_versions,
    allow_historical_verification: key.allow_historical_verification,
    historical_verify_until: key.historical_verify_until,
    reason_class: key.reason_class,
  };
}

export function buildIssuerAuthorityStatementFromRegistry(input: {
  registryVersion: number;
  supersedesRegistryVersion?: number | null;
  anchorKeyId: string;
  issuedAt?: string;
  env?: Record<string, string | undefined>;
}):
  | { ok: true; payload: IssuerAuthorityStatementPayload }
  | { ok: false; reason: string } {
  const loaded = loadReceiptVerificationRegistry(input.env ?? process.env);
  if (!loaded.ok) return { ok: false, reason: loaded.reason };
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  return {
    ok: true,
    payload: {
      document: "abraxas_issuer_authority_statement",
      schema_version: "1.0.0",
      registry_version: input.registryVersion,
      supersedes_registry_version: input.supersedesRegistryVersion ?? null,
      environment: loaded.environment,
      issued_at: issuedAt,
      not_before: issuedAt,
      anchor_key_id: input.anchorKeyId,
      keys: loaded.keys.map(toEntry),
    },
  };
}

export function publishSignedIssuerAuthorityFromRegistry(input: {
  registryVersion: number;
  supersedesRegistryVersion?: number | null;
  anchorKeyId: string;
  anchorPrivateJwk: JsonWebKey;
  env?: Record<string, string | undefined>;
}): SignedIssuerAuthorityStatement | { ok: false; reason: string } {
  const built = buildIssuerAuthorityStatementFromRegistry(input);
  if (!built.ok) return built;
  return signIssuerAuthorityPayload(built.payload, input.anchorPrivateJwk);
}
