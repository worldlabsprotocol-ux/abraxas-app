// FILE: lib/auth/nativeAccount/solanaAuth/message.ts
// Abraxas wallet authorization envelope for native account sign-in (plain signMessage; not SIWS-shaped).

import {
  buildWalletAuthorizationMessage,
  WALLET_AUTH_PURPOSE_SIGN_IN,
} from "@/lib/auth/ephemeralWallet/protocolEnvelope";
import {
  ACCOUNT_SOL_AUTH_INTENT,
  NATIVE_ACCOUNT_SIGN_IN_RESOURCE,
  NATIVE_ACCOUNT_WALLET_AUDIENCE,
} from "./contract";

export function buildAccountSolanaSignInMessage(input: {
  domain: string;
  walletAddress: string;
  uri: string;
  solanaNetwork: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  requestId: string;
  origin: string;
}): string {
  return buildWalletAuthorizationMessage({
    domain: input.domain,
    audience: NATIVE_ACCOUNT_WALLET_AUDIENCE,
    walletAddress: input.walletAddress,
    uri: input.uri,
    solanaNetwork: input.solanaNetwork,
    nonce: input.nonce,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    requestId: input.requestId,
    origin: input.origin,
    purpose: WALLET_AUTH_PURPOSE_SIGN_IN,
    operation: ACCOUNT_SOL_AUTH_INTENT,
    resource: NATIVE_ACCOUNT_SIGN_IN_RESOURCE,
    policyId: null,
    human: null,
  });
}

export function encodeAccountSolanaSignInMessage(message: string): Uint8Array {
  return new TextEncoder().encode(message);
}
