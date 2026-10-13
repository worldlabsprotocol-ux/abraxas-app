// FILE: lib/auth/passportSolanaAuth/message.ts

import type { HolderAuthIntendedAction } from "@/lib/auth/holderSubject/contract";

export function buildPassportSolanaAuthMessage(input: {
  origin: string;
  walletAddress: string;
  solanaNetwork: string;
  intendedAction: HolderAuthIntendedAction;
  nonce: string;
  expiresAt: string;
  sessionContext: string;
}): string {
  return [
    "Abraxas Passport Solana authentication",
    `Origin: ${input.origin}`,
    `Wallet: ${input.walletAddress}`,
    `Network: ${input.solanaNetwork}`,
    `Action: ${input.intendedAction}`,
    `Session: ${input.sessionContext}`,
    `Nonce: ${input.nonce}`,
    `Expires: ${input.expiresAt}`,
  ].join("\n");
}

export function encodePassportSolanaMessage(message: string): Uint8Array {
  return new TextEncoder().encode(message);
}
