// FILE: lib/auth/ephemeralWallet/actionDisplayContext.ts

import { resolveEphemeralSandboxTestPolicy } from "./sandboxTestPolicies";
import type { WalletAuthorizationHumanContext } from "./protocolEnvelope";
import {
  WALLET_SCOPED_FINANCIAL_SAFETY_LINES,
  WALLET_SIGN_IN_FUNDS_LINES,
} from "./walletMessageSafetyCopy";

export type WalletActionOperation = "sandbox:enter" | "sandbox:verification:test";

export type WalletActionChallengeDisplay = {
  kind: "scoped_authorization";
  action_title: string;
  authorization_summary: string;
  recipient: string;
  consequence_line: string;
  financial_safety_lines: readonly string[];
  policy_label: string | null;
  policy_id: string | null;
  environment: string;
  requested_by: string;
  wallet_address: string;
  expires_at: string;
  challenge_id: string;
};

function scopedVerificationConsequence(policyId: string): string {
  if (policyId === "wallet_control") {
    return "This records your approval to run a wallet-control test verification in the sandbox. It does not move funds or grant spending access.";
  }
  if (policyId === "age_21_retail") {
    return "This records your approval for an Age 21 demonstration only. It does not prove real-world age eligibility or disclose identity documents.";
  }
  return "This records your approval for the sandbox test verification described above.";
}

export function resolveWalletActionHumanContext(input: {
  operation: WalletActionOperation;
  policyId?: string | null;
}): WalletAuthorizationHumanContext {
  if (input.operation === "sandbox:verification:test") {
    const policy = input.policyId ? resolveEphemeralSandboxTestPolicy(input.policyId) : null;
    const policyId = input.policyId ?? null;
    const label = policy?.label ?? policyId;
    return {
      actionTitle: "Authorize test verification",
      policyLabel: policy?.label ?? null,
      policyId,
      environment: "Sandbox",
      requestedBy: "Abraxas Developer Workspace",
      authorizationSummary: label
        ? `Sandbox test verification for policy ${label}${policyId ? ` (${policyId})` : ""}.`
        : "Sandbox test verification.",
      recipient: "Abraxas Developer Workspace (sandbox evaluation)",
      consequenceLine: policyId ? scopedVerificationConsequence(policyId) : scopedVerificationConsequence(""),
    };
  }
  if (input.operation === "sandbox:enter") {
    return {
      actionTitle: "Open developer sandbox workspace",
      environment: "Sandbox",
      requestedBy: "Abraxas Developer Workspace",
      authorizationSummary: "Open an isolated developer sandbox workspace on your signed-in account.",
      recipient: "Abraxas Developer Workspace",
      consequenceLine:
        "This creates a time-limited sandbox session for policy testing. It does not publish credentials or change production access.",
    };
  }
  return {
    actionTitle: "Authorize wallet action",
    authorizationSummary: "Authorize a scoped wallet action in Abraxas.",
    recipient: "Abraxas",
    consequenceLine: "This records your approval for the action described above.",
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
    kind: "scoped_authorization",
    action_title: human.actionTitle,
    authorization_summary:
      human.authorizationSummary?.trim() ?? human.actionTitle,
    recipient: human.recipient?.trim() ?? human.requestedBy ?? "Abraxas",
    consequence_line:
      human.consequenceLine?.trim()
      ?? "This records your approval for the action described above.",
    financial_safety_lines: WALLET_SCOPED_FINANCIAL_SAFETY_LINES,
    policy_label: human.policyLabel ?? null,
    policy_id: human.policyId ?? null,
    environment: human.environment ?? "Sandbox",
    requested_by: human.requestedBy ?? "Abraxas Developer Workspace",
    wallet_address: input.walletAddress,
    expires_at: input.expiresAt,
    challenge_id: input.challengeId,
  };
}

/** Sign-in funds lines — not used for scoped authorization UI. */
export { WALLET_SIGN_IN_FUNDS_LINES };
