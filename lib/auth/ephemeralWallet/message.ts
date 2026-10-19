// FILE: lib/auth/ephemeralWallet/message.ts

import {
  buildWalletAuthorizationMessage,
  WALLET_AUTH_PURPOSE_SIGN_IN,
} from "./protocolEnvelope";
import { EPHEMERAL_WALLET_JWT_AUDIENCE } from "./contract";

/** @deprecated Use WALLET_AUTH_PURPOSE_SIGN_IN */
export const EPHEMERAL_WALLET_AUTH_PURPOSE = WALLET_AUTH_PURPOSE_SIGN_IN;

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
  return buildWalletAuthorizationMessage({
    domain: input.domain,
    audience: EPHEMERAL_WALLET_JWT_AUDIENCE,
    walletAddress: input.walletAddress,
    uri: input.uri,
    solanaNetwork: input.solanaNetwork,
    nonce: input.nonce,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    requestId: input.challengeId,
    origin: input.origin,
    purpose: WALLET_AUTH_PURPOSE_SIGN_IN,
    operation: "wallet:authenticate",
    resource: "abraxas:capability:wallet_session",
    policyId: null,
    human: {
      actionTitle: "Wallet sign-in",
      environment: "Abraxas",
      requestedBy: input.domain,
      fundsSafetyLine: "No token transfer or spending approval is requested.",
    },
  });
}
