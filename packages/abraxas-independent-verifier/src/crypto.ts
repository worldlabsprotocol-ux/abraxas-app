import nacl from "tweetnacl";

export function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Uint8Array.from(Buffer.from(padded + pad, "base64"));
}

export function ed25519PublicFromJwk(jwk: JsonWebKey): Uint8Array | null {
  if (!jwk.x) return null;
  const bytes = base64UrlDecode(jwk.x);
  if (bytes.length !== 32) return null;
  return bytes;
}

export function verifyEd25519Detached(input: {
  message: Uint8Array;
  signatureBase64Url: string;
  publicJwk: JsonWebKey;
}): boolean {
  const pub = ed25519PublicFromJwk(input.publicJwk);
  if (!pub) return false;
  let sig: Uint8Array;
  try {
    sig = base64UrlDecode(input.signatureBase64Url);
  } catch {
    return false;
  }
  if (sig.length !== nacl.sign.signatureLength) return false;
  return nacl.sign.detached.verify(input.message, sig, pub);
}
