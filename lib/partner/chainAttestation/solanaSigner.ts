// Dedicated Ed25519 Solana attestation signer. Never reuses receipt keys.

import nacl from "tweetnacl";
import { RECEIPT_SIGNING_KEY_ENVS } from "./signer";
import { hexToBytes } from "./solanaMessage";

export const SOLANA_ATTESTATION_KEY_ENV = "ABRAXAS_SOLANA_ATTESTATION_PRIVATE_KEY" as const;
export const SOLANA_ATTESTATION_KEY_ID_ENV = "ABRAXAS_SOLANA_ATTESTATION_SIGNER_KEY_ID" as const;

export interface SolanaAttestationSigner {
  keyId: string;
  publicKey: Uint8Array;
  sign(message: Uint8Array): Uint8Array;
}

export function loadSolanaAttestationSigner():
  | { ok: true; signer: SolanaAttestationSigner }
  | { ok: false; reason: "attestation_unavailable" } {
  const raw = process.env[SOLANA_ATTESTATION_KEY_ENV]?.trim() ?? "";
  const keyId = process.env[SOLANA_ATTESTATION_KEY_ID_ENV]?.trim() ?? "";
  if (!raw || !keyId) return { ok: false, reason: "attestation_unavailable" };
  if (RECEIPT_SIGNING_KEY_ENVS.some((name) => process.env[name]?.trim() && process.env[name]?.trim() === raw)) {
    return { ok: false, reason: "attestation_unavailable" };
  }
  const secret = parseSecretKey(raw);
  if (!secret) return { ok: false, reason: "attestation_unavailable" };
  try {
    const pair = secret.length === 64
      ? nacl.sign.keyPair.fromSecretKey(secret)
      : nacl.sign.keyPair.fromSeed(secret);
    return {
      ok: true,
      signer: {
        keyId,
        publicKey: pair.publicKey,
        sign(message) {
          return nacl.sign.detached(message, pair.secretKey);
        },
      },
    };
  } catch {
    return { ok: false, reason: "attestation_unavailable" };
  }
}

function parseSecretKey(raw: string): Uint8Array | null {
  const hex = raw.startsWith("0x") ? raw.slice(2) : raw;
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) return null;
  const bytes = hexToBytes(`0x${hex}`);
  if (bytes.length !== 32 && bytes.length !== 64) return null;
  return bytes;
}
