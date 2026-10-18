// FILE: lib/auth/ephemeralWallet/protocolEnvelope.ts
// Canonical Abraxas wallet authorization envelope (SIWS-style, purpose-separated).

export const ABRAXAS_WALLET_PROTOCOL_ID = "abraxas-wallet-trust" as const;
export const ABRAXAS_WALLET_PROTOCOL_VERSION = "1" as const;

/** Sign-in only — never authorizes transfers, issuance, or production policy changes. */
export const WALLET_AUTH_PURPOSE_SIGN_IN = "abraxas_wallet_sign_in_v1" as const;

export const WALLET_AUTH_PURPOSE_SANDBOX_ENTER = "abraxas_action_sandbox_enter_v1" as const;
export const WALLET_AUTH_PURPOSE_SANDBOX_TEST_VERIFY =
  "abraxas_action_sandbox_test_verify_v1" as const;

export type WalletAuthorizationPurpose =
  | typeof WALLET_AUTH_PURPOSE_SIGN_IN
  | typeof WALLET_AUTH_PURPOSE_SANDBOX_ENTER
  | typeof WALLET_AUTH_PURPOSE_SANDBOX_TEST_VERIFY;

export function buildWalletAuthorizationMessage(input: {
  domain: string;
  audience: string;
  walletAddress: string;
  uri: string;
  solanaNetwork: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  requestId: string;
  origin: string;
  purpose: WalletAuthorizationPurpose;
  operation: string;
  resource: string;
  policyId?: string | null;
}): string {
  const policyLine =
    input.policyId && input.policyId.trim()
      ? `Policy: ${input.policyId.trim()}`
      : "Policy: (none)";
  return [
    `${input.domain} requests Abraxas wallet authorization:`,
    input.walletAddress,
    "",
    `Protocol: ${ABRAXAS_WALLET_PROTOCOL_ID}`,
    `Protocol Version: ${ABRAXAS_WALLET_PROTOCOL_VERSION}`,
    `Audience: ${input.audience}`,
    `URI: ${input.uri}`,
    "Version: 1",
    `Chain ID: ${input.solanaNetwork}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
    `Expiration Time: ${input.expiresAt}`,
    `Request ID: ${input.requestId}`,
    `Origin: ${input.origin}`,
    `Purpose: ${input.purpose}`,
    `Operation: ${input.operation}`,
    `Resource: ${input.resource}`,
    policyLine,
  ].join("\n");
}
