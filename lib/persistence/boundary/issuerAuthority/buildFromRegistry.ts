// FILE: lib/persistence/boundary/issuerAuthority/buildFromRegistry.ts

import { resolveReceiptKeyRuntimeEnvironment } from "@/lib/decisionReceipts/verificationKeyLifecycle/environment";
import { loadReceiptVerificationRegistry } from "@/lib/decisionReceipts/verificationKeyLifecycle/registry";
import type { ReceiptVerificationKeyRecord } from "@/lib/decisionReceipts/verificationKeyLifecycle/contract";
import type {
  IssuerAuthorityKeyEntry,
  IssuerAuthorityStatementPayload,
  StatusSignerKeyEntry,
} from "./contract";
import type { SignedIssuerAuthorityStatement } from "./contract";
import { signIssuerAuthorityPayload } from "./signVerify";

function loadStatusSignerFromEnv(env: Record<string, string | undefined>): StatusSignerKeyEntry[] {
  const keyId = env.ABRAXAS_STATUS_SIGNER_KEY_ID?.trim();
  const publicJson = env.ABRAXAS_STATUS_SIGNER_PUBLIC_JWK?.trim();
  if (!keyId || !publicJson) return [];
  try {
    const public_jwk = JSON.parse(publicJson) as JsonWebKey;
    const environment = resolveReceiptKeyRuntimeEnvironment(env);
    return [
      {
        key_id: keyId,
        environment,
        status: "active",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        public_jwk,
        reason_class: "active",
      },
    ];
  } catch {
    return [];
  }
}

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
  const env = input.env ?? process.env;
  const loaded = loadReceiptVerificationRegistry(env);
  if (!loaded.ok) return { ok: false, reason: loaded.reason };
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  const statusSigners = loadStatusSignerFromEnv(env);
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
      ...(statusSigners.length > 0 ? { status_signers: statusSigners } : {}),
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
