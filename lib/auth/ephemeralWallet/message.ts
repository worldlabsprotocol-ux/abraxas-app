// FILE: lib/auth/ephemeralWallet/message.ts

export const EPHEMERAL_WALLET_AUTH_PURPOSE = "abraxas_ephemeral_wallet_sign_in" as const;

export function buildEphemeralWalletSignInMessage(input: {
  domain: string;
  walletAddress: string;
  uri: string;
  solanaNetwork: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  challengeId: string;
  origin: string;
}): string {
  return [
    `${input.domain} wants you to sign in with your Solana account:`,
    input.walletAddress,
    "",
    `URI: ${input.uri}`,
    "Version: 1",
    `Chain ID: ${input.solanaNetwork}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
    `Expiration Time: ${input.expiresAt}`,
    `Challenge ID: ${input.challengeId}`,
    `Origin: ${input.origin}`,
    `Purpose: ${EPHEMERAL_WALLET_AUTH_PURPOSE}`,
  ].join("\n");
}
