// FILE: lib/partner/walletStandard/verify.ts
// Server-side Ed25519 message verify. SignMessage only. No transactions.

import nacl from "tweetnacl";

export function decodeWalletKeyMaterial(value: string): Uint8Array | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length === 64) {
      return Uint8Array.from(Buffer.from(trimmed, "hex"));
    }
    const buf = Buffer.from(trimmed, "base64");
    if (buf.length === 32 || buf.length === 64) return new Uint8Array(buf.subarray(0, 32));
  } catch {
    return null;
  }
  return null;
}

export function decodeWalletSignature(value: string): Uint8Array | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const buf = Buffer.from(trimmed, "base64");
    if (buf.length === 64) return new Uint8Array(buf);
    if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length === 128) {
      return Uint8Array.from(Buffer.from(trimmed, "hex"));
    }
  } catch {
    return null;
  }
  return null;
}

export function verifyWalletStandardSignature(input: {
  message: string;
  signature: string;
  publicKey: string;
}): boolean {
  const pub = decodeWalletKeyMaterial(input.publicKey);
  const sig = decodeWalletSignature(input.signature);
  if (!pub || pub.length !== 32 || !sig || sig.length !== 64) return false;
  const msg = new TextEncoder().encode(input.message);
  try {
    return nacl.sign.detached.verify(msg, sig, pub);
  } catch {
    return false;
  }
}
