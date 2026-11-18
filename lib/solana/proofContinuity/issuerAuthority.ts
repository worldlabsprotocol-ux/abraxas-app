import type { DecodedProofContinuityRegistry } from "./decodeRegistry";

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Uint8Array.from(Buffer.from(padded + pad, "base64"));
}

export function ed25519PublicKeyBytesFromJwk(publicKeyJwk: JsonWebKey): Buffer | null {
  if (typeof publicKeyJwk.x !== "string") return null;
  const raw = Buffer.from(base64UrlDecode(publicKeyJwk.x));
  if (raw.length !== 32) return null;
  return raw;
}

export function registryAuthorizesIssuer(
  registry: DecodedProofContinuityRegistry,
  issuerPublicKeyJwk: JsonWebKey,
): { ok: true } | { ok: false; reason: string } {
  const issuer = ed25519PublicKeyBytesFromJwk(issuerPublicKeyJwk);
  if (!issuer) return { ok: false, reason: "chain_evidence_issuer_key_invalid" };
  if (registry.trusted_issuer_pubkey !== issuer.toString("hex")) {
    return { ok: false, reason: "chain_evidence_unauthorized_issuer" };
  }
  return { ok: true };
}