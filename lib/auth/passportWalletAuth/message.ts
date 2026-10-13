// FILE: lib/auth/passportWalletAuth/message.ts

import type { PassportWalletIntendedAction } from "./contract";

export function buildPassportWalletAuthMessage(input: {
  origin: string;
  walletAddress: string;
  suiNetwork: string;
  intendedAction: PassportWalletIntendedAction;
  nonce: string;
  expiresAt: string;
  sessionContext: string;
}): string {
  return [
    "Abraxas Passport wallet authentication",
    `Origin: ${input.origin}`,
    `Wallet: ${input.walletAddress}`,
    `Network: ${input.suiNetwork}`,
    `Action: ${input.intendedAction}`,
    `Session: ${input.sessionContext}`,
    `Nonce: ${input.nonce}`,
    `Expires: ${input.expiresAt}`,
  ].join("\n");
}

export function encodePassportWalletMessage(message: string): Uint8Array {
  return new TextEncoder().encode(message);
}
