// FILE: lib/auth/passportSolanaAuth/verifySignature.ts

import nacl from "tweetnacl";
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import { encodePassportSolanaMessage } from "./message";

function decodeSolanaSignature(signature: string): Uint8Array | null {
  const trimmed = signature.trim();
  try {
    if (/^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmed)) {
      return bs58.decode(trimmed);
    }
    return Uint8Array.from(Buffer.from(trimmed, "base64"));
  } catch {
    return null;
  }
}

export function verifyPassportSolanaPersonalMessage(input: {
  message: string;
  signature: string;
  walletAddress: string;
}): boolean {
  try {
    const pubkey = new PublicKey(input.walletAddress.trim());
    const bytes = encodePassportSolanaMessage(input.message);
    const sig = decodeSolanaSignature(input.signature);
    if (!sig) return false;
    return nacl.sign.detached.verify(bytes, sig, pubkey.toBytes());
  } catch {
    return false;
  }
}
