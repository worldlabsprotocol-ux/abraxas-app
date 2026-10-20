// FILE: lib/auth/ephemeralWallet/actionDisplayContext.ts

import { resolveEphemeralSandboxTestPolicy } from "./sandboxTestPolicies";

export type WalletActionOperation = "sandbox:enter" | "sandbox:verification:test";
import type { WalletAuthorizationHumanContext } from "./protocolEnvelope";
import { WALLET_MESSAGE_ONLY_FUNDS_LINES } from "./walletMessageSafetyCopy";

export type WalletActionChallengeDisplay = {
  action_title: string;
  policy_label: string | null;
  policy_id: string | null;
  environment: string;
  requested_by: string;
  wallet_address: string;
  funds_note: string;
  expires_at: string;
  challenge_id: string;
};

export function resolveWalletActionHumanContext(input: {
  operation: WalletActionOperation;
  policyId?: string | null;
}): WalletAuthorizationHumanContext {
  if (input.operation === "sandbox:verification:test") {
    const policy = input.policyId ? resolveEphemeralSandboxTestPolicy(input.policyId) : null;
    return {
      actionTitle: "Authorize test verification",
      policyLabel: policy?.label ?? null,
      policyId: input.policyId ?? null,
      environment: "Sandbox",
      requestedBy: "Abraxas Developer Workspace",
    };
  }
  if (input.operation === "sandbox:enter") {
    return {
      actionTitle: "Open developer sandbox workspace",
      environment: "Sandbox",
      requestedBy: "Abraxas Developer Workspace",
    };
  }
  return {
    actionTitle: "Authorize wallet action",
  };
}

export function buildWalletActionChallengeDisplay(input: {
  operation: WalletActionOperation;
  policyId?: string | null;
  walletAddress: string;
  expiresAt: string;
  challengeId: string;
}): WalletActionChallengeDisplay {
  const human = resolveWalletActionHumanContext({
    operation: input.operation,
    policyId: input.policyId,
  });
  return {
    action_title: human.actionTitle,
    policy_label: human.policyLabel ?? null,
    policy_id: human.policyId ?? null,
    environment: human.environment ?? "Sandbox",
    requested_by: human.requestedBy ?? "Abraxas Developer Workspace",
    wallet_address: input.walletAddress,
    funds_note: human.fundsSafetyLine ?? WALLET_MESSAGE_ONLY_FUNDS_LINES.join(" "),
    expires_at: input.expiresAt,
    challenge_id: input.challengeId,
  };
}
