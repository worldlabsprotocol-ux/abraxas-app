import { TransactionInstruction, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";

export const ED25519_PROGRAM_ID = new PublicKey("Ed25519SigVerify111111111111111111111111111");

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Uint8Array.from(Buffer.from(padded + pad, "base64"));
}

/** Builds the Solana ed25519 signature verification instruction (issuer pre-step). */
export function buildEd25519VerifyInstruction(
  issuerPublicKey32: Buffer,
  issuerSecretKey64: Uint8Array,
  message: Buffer,
): TransactionInstruction {
  const headerLen = 16;
  const publicKeyOffset = headerLen;
  const signatureOffset = publicKeyOffset + 32;
  const messageOffset = signatureOffset + 64;
  const data = Buffer.alloc(messageOffset + message.length);
  data[0] = 1;
  data.writeUInt16LE(signatureOffset, 2);
  data.writeUInt16LE(0xffff, 4);
  data.writeUInt16LE(publicKeyOffset, 6);
  data.writeUInt16LE(0xffff, 8);
  data.writeUInt16LE(messageOffset, 10);
  data.writeUInt16LE(message.length, 12);
  data.writeUInt16LE(0xffff, 14);
  issuerPublicKey32.copy(data, publicKeyOffset);
  const signature = nacl.sign.detached(message, issuerSecretKey64);
  Buffer.from(signature).copy(data, signatureOffset);
  message.copy(data, messageOffset);
  return new TransactionInstruction({
    programId: ED25519_PROGRAM_ID,
    keys: [],
    data,
  });
}

export function ed25519SecretKeyFromJwk(privateKeyJwk: JsonWebKey): Uint8Array | null {
  if (typeof privateKeyJwk.d !== "string") return null;
  const seed = base64UrlDecode(privateKeyJwk.d);
  if (seed.length !== 32) return null;
  return nacl.sign.keyPair.fromSeed(seed).secretKey;
}

export function ed25519PublicKey32FromJwk(publicKeyJwk: JsonWebKey): Buffer | null {
  if (typeof publicKeyJwk.x !== "string") return null;
  const raw = Buffer.from(base64UrlDecode(publicKeyJwk.x));
  return raw.length === 32 ? raw : null;
}