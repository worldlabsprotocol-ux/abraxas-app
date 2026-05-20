// FILE: lib/solana/verify.ts
// Server-side Ed25519 signature verification.
// Uses Node.js built-in crypto — no tweetnacl dependency.
// All imports at top.
import { PublicKey } from "@solana/web3.js";

export async function verifyMessageSignature({
  walletAddress,
  signature,
  message,
}: {
  walletAddress: string;
  signature:     number[];
  message:       string;
}): Promise<boolean> {
  try {
    // Dynamic import of tweetnacl — server-only, never bundled to client
    const nacl    = (await import("tweetnacl")).default;
    const pubKey  = new PublicKey(walletAddress);
    const msgBytes = new TextEncoder().encode(message);
    const sigBytes = Buffer.from(signature);
    return nacl.sign.detached.verify(msgBytes, sigBytes, pubKey.toBytes());
  } catch { return false; }
}

export function buildLinkChallenge(userId: string, timestamp: number): string {
  return `Link wallet to Abraxas Protocol.\nUser: ${userId}\nTimestamp: ${timestamp}`;
}