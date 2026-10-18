// FILE: lib/auth/nativeAccount/solanaAuth/message.ts
// Sign-In With Solana–compatible account authentication message.

export function buildAccountSolanaSignInMessage(input: {
  domain: string;
  walletAddress: string;
  uri: string;
  solanaNetwork: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  requestId: string;
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
    `Request ID: ${input.requestId}`,
  ].join("\n");
}

export function encodeAccountSolanaSignInMessage(message: string): Uint8Array {
  return new TextEncoder().encode(message);
}
