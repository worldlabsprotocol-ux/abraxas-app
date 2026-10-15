// FILE: lib/passport/reusableCredential/holderPossessionKeyValidation.ts

import nacl from "tweetnacl";

export type PossessionPublicKeyValidationResult =
  | { ok: true; publicKey: Uint8Array; publicKeyB64Url: string }
  | { ok: false; code: "missing" | "invalid_encoding" | "invalid_length" };

export function validateHolderPossessionPublicKeyB64Url(input: string | null | undefined): PossessionPublicKeyValidationResult {
  const trimmed = input?.trim();
  if (!trimmed) return { ok: false, code: "missing" };
  if (trimmed.length < 32 || trimmed.length > 128) return { ok: false, code: "invalid_length" };
  try {
    const padded = trimmed.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
    const bytes = Uint8Array.from(Buffer.from(padded + pad, "base64"));
    if (bytes.length !== 32) return { ok: false, code: "invalid_length" };
    // Ed25519 public keys must verify as valid curve points when used; reject all-zero keys.
    if (bytes.every((b) => b === 0)) return { ok: false, code: "invalid_encoding" };
    // Round-trip normalize encoding.
    const normalized = Buffer.from(bytes).toString("base64url");
    return { ok: true, publicKey: bytes, publicKeyB64Url: normalized };
  } catch {
    return { ok: false, code: "invalid_encoding" };
  }
}

export function possessionKeysEqual(a: string, b: string): boolean {
  const left = validateHolderPossessionPublicKeyB64Url(a);
  const right = validateHolderPossessionPublicKeyB64Url(b);
  if (!left.ok || !right.ok) return false;
  return nacl.verify(left.publicKey, right.publicKey);
}
