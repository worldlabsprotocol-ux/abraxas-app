// FILE: lib/passport/reusableCredential/passportCredentialSigning.ts
// Passport reusable credential signing keys (distinct signing_key_id from decision receipts).

import type { ReceiptSigningKeyPair } from "@/lib/decisionReceipts/signing";

export const PASSPORT_CREDENTIAL_SIGNING_KEY_ENV = "ABRAXAS_PASSPORT_CREDENTIAL_SIGNING_KEY";
export const PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV = "ABRAXAS_PASSPORT_CREDENTIAL_SIGNING_KEY_ID";

export function getPassportCredentialSigningKeyId(): string {
  return process.env[PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV]?.trim() || "passport-credential-issuer";
}

export function loadPassportCredentialSigningKey(): ReceiptSigningKeyPair | null {
  const signingKeyJson =
    process.env[PASSPORT_CREDENTIAL_SIGNING_KEY_ENV]?.trim()
    || process.env.ABRAXAS_SIGNING_KEY?.trim();
  if (!signingKeyJson) return null;
  try {
    const privateKeyJwk = JSON.parse(signingKeyJson) as JsonWebKey;
    const publicKeyJson = process.env.ABRAXAS_PASSPORT_CREDENTIAL_PUBLIC_KEY?.trim()
      || process.env.ABRAXAS_PUBLIC_KEY?.trim();
    const publicKeyJwk = publicKeyJson
      ? (JSON.parse(publicKeyJson) as JsonWebKey)
      : { kty: privateKeyJwk.kty, crv: privateKeyJwk.crv, x: privateKeyJwk.x };
    return {
      signingKeyId: getPassportCredentialSigningKeyId(),
      privateKeyJwk,
      publicKeyJwk,
    };
  } catch {
    return null;
  }
}
