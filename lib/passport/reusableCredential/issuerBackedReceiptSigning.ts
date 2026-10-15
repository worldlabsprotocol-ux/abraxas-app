// FILE: lib/passport/reusableCredential/issuerBackedReceiptSigning.ts

import "server-only";

import { loadReceiptSigningKey, type ReceiptSigningKeyPair } from "@/lib/decisionReceipts/signing";

export type RequireIssuerBackedReceiptSigningKeyResult =
  | { ok: true; key: ReceiptSigningKeyPair }
  | { ok: false; code: "receipt_signing_key_unconfigured" | "receipt_signing_key_invalid" };

export function requireIssuerBackedReceiptSigningKey(): RequireIssuerBackedReceiptSigningKeyResult {
  const key = loadReceiptSigningKey();
  if (!key?.privateKeyJwk?.d || !key.signingKeyId) {
    return { ok: false, code: "receipt_signing_key_unconfigured" };
  }
  return { ok: true, key };
}
