// AWS KMS Sign for ECC_NIST_EDWARDS25519.
// ED25519_SHA_512 + MessageType RAW is standard Ed25519 over the supplied bytes.
// ED25519_PH_SHA_512 prehashes with SHA-512 and will not verify in Abraxas.
// GetPublicKey returns an X.509 SubjectPublicKeyInfo. Ed25519 uses OID 1.3.101.112.
// Rates recorded from https://aws.amazon.com/kms/pricing/ (commercial regions):
// $1 per customer-managed key per month, $0.15 per 10,000 asymmetric requests.
// Asymmetric Sign is outside the 20,000-request free tier.

import { INSTITUTIONAL_ED25519_KEY_SPEC } from "./contract";

export const AWS_KMS_ED25519 = {
  keySpec: INSTITUTIONAL_ED25519_KEY_SPEC,
  signingAlgorithm: "ED25519_SHA_512",
  messageType: "RAW",
  digestBytes: 32,
  signatureBytes: 64,
} as const;

export const AWS_KMS_ED25519_INCOMPATIBLE = {
  signingAlgorithm: "ED25519_PH_SHA_512",
  messageType: "DIGEST",
} as const;

export const AWS_KMS_PUBLISHED_COST = {
  usdPerCustomerManagedKeyMonth: 1,
  usdPer10000AsymmetricRequests: 0.15,
  asymmetricSignExcludedFromFreeTier: true,
  source: "https://aws.amazon.com/kms/pricing/",
} as const;

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export function ed25519SpkiFromRawPublicKey(raw: Uint8Array): Uint8Array {
  if (raw.byteLength !== 32) throw new Error("ed25519_public_key_length");
  return Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(raw)]);
}

export function ed25519RawPublicKeyFromSpki(der: Uint8Array): Uint8Array | null {
  if (der.byteLength !== ED25519_SPKI_PREFIX.length + 32) return null;
  const bytes = Buffer.from(der);
  if (!bytes.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)) return null;
  return bytes.subarray(ED25519_SPKI_PREFIX.length);
}
