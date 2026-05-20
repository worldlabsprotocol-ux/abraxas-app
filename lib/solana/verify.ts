// FILE: lib/solana/verify.ts
// Server-side Ed25519 signature verification.
// Used by the wallet-link endpoint to confirm wallet ownership.
// All imports at top.
import { PublicKey } from "@solana/web3.js";
import { Buffer }    from "buffer";
import nacl          from "tweetnacl";

export async function verifyMessageSignature({
  walletAddress,
  signature,
  message,
}: {
  walletAddress: string;
  signature:     string | number[];
  message:       string;
}): Promise<boolean> {
  try {
    const pubKey  = new PublicKey(walletAddress);
    const msgBytes = new TextEncoder().encode(message);
    const sigBytes = typeof signature === "string"
      ? Buffer.from(signature, "base64")
      : Buffer.from(signature);
    return nacl.sign.detached.verify(
      msgBytes,
      sigBytes,
      pubKey.toBytes()
    );
  } catch {
    return false;
  }
}

// Challenge message template — must match what the frontend signs
export function buildLinkChallenge(userId: string, timestamp: number): string {
  return `Link wallet to Abraxas Protocol account.\nUser: ${userId}\nTimestamp: ${timestamp}\nThis signature will not trigger any transaction.`;
}