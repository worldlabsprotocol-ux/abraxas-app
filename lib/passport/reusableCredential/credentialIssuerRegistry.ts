// FILE: lib/passport/reusableCredential/credentialIssuerRegistry.ts
// Credential issuer trust is independent of decision receipt signing keys.

import type { ReceiptSigningKeyPair } from "@/lib/decisionReceipts/signing";

export const PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV = "ABRAXAS_PASSPORT_CREDENTIAL_ISSUER_REGISTRY";

export type PassportCredentialIssuerRegistryEntry = {
  issuer_id: string;
  signing_key_id: string;
  public_jwk: JsonWebKey;
  revocation_issuer_id: string;
  snapshot_signing_key_ids: string[];
};

export function loadPassportCredentialIssuerRegistry(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): PassportCredentialIssuerRegistryEntry[] {
  const raw = env[PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV]?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PassportCredentialIssuerRegistryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function resolvePassportCredentialIssuerTrust(input: {
  issuerId: string;
  signingKeyId: string;
  env?: Record<string, string | undefined>;
}):
  | { ok: true; entry: PassportCredentialIssuerRegistryEntry }
  | { ok: false; code: "issuer_registry_missing" | "issuer_untrusted" | "signing_key_mismatch" } {
  const registry = loadPassportCredentialIssuerRegistry(input.env);
  if (!registry.length) {
    return { ok: false, code: "issuer_registry_missing" };
  }
  const entry = registry.find((row) => row.issuer_id === input.issuerId);
  if (!entry) {
    return { ok: false, code: "issuer_untrusted" };
  }
  if (entry.signing_key_id !== input.signingKeyId) {
    return { ok: false, code: "signing_key_mismatch" };
  }
  return { ok: true, entry };
}

export function credentialIssuerRegistryFromKeyPair(input: {
  issuerId: string;
  key: ReceiptSigningKeyPair;
  revocationIssuerId: string;
  snapshotSigningKeyIds: string[];
}): PassportCredentialIssuerRegistryEntry {
  return {
    issuer_id: input.issuerId,
    signing_key_id: input.key.signingKeyId,
    public_jwk: {
      kty: input.key.publicKeyJwk.kty,
      crv: input.key.publicKeyJwk.crv,
      x: input.key.publicKeyJwk.x,
    },
    revocation_issuer_id: input.revocationIssuerId,
    snapshot_signing_key_ids: input.snapshotSigningKeyIds,
  };
}
