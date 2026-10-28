// FILE: lib/auth/ephemeralWallet/walletActionChallengeClientRequest.ts
// Canonical wallet action challenge POST body.

import type { WalletActionOperation } from "./actionDisplayContext";

export const WALLET_ACTION_CHALLENGE_BODY_KEYS = [
  "operation",
  "resource",
  "policy_id",
  "solana_network",
] as const;

export function buildWalletActionChallengeRequestBody(input: {
  operation: WalletActionOperation;
  resource: string;
  policyId?: string | null;
  solanaNetwork?: string | null;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    operation: input.operation,
    resource: input.resource,
  };
  if (input.policyId != null && input.policyId !== "") {
    body.policy_id = input.policyId;
  }
  if (input.solanaNetwork != null && input.solanaNetwork !== "") {
    body.solana_network = input.solanaNetwork;
  }
  return body;
}
