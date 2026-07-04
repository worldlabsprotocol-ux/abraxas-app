// FILE: lib/passportCompletion.ts
// Unified passport completion model for dashboard + progress UI.

import type { IdentityStampStatus, CredentialVerifyState } from "@/lib/hooks/usePassportVerification";
import type { OnChainPassportStatus } from "@/lib/hooks/usePassportVerification";

export type ChecklistStatus = "verified" | "pending" | "optional" | "not_started";

export interface PassportChecklistItem {
  id: string;
  label: string;
  detail: string;
  status: ChecklistStatus;
  weight: number;
  step?: 1 | 2 | 3 | 4;
}

export interface PassportCompletion {
  percent: number;
  items: PassportChecklistItem[];
  verifiedCount: number;
  pendingCount: number;
  optionalCount: number;
}

export interface PassportCompletionInput {
  walletDone: boolean;
  identityStatus: IdentityStampStatus;
  credentialActive: boolean;
  verifyState: CredentialVerifyState;
  onChain: OnChainPassportStatus | null;
  intentProofs: number;
  stamps: {
    identity: "earned" | "in_progress" | "not_started";
    business: "earned" | "in_progress" | "not_started";
    asset_owner: "earned" | "in_progress" | "not_started";
  };
}

function stampStatus(
  stamp: "earned" | "in_progress" | "not_started",
): ChecklistStatus {
  if (stamp === "earned") return "verified";
  if (stamp === "in_progress") return "pending";
  return "optional";
}

export function computePassportCompletion(input: PassportCompletionInput): PassportCompletion {
  const identityChecklist: ChecklistStatus =
    input.identityStatus === "earned" ? "verified"
    : input.identityStatus === "pending" ? "pending"
    : input.walletDone ? "optional"
    : "not_started";

  const passportChecklist: ChecklistStatus =
    input.credentialActive && input.onChain?.stamps_complete ? "verified"
    : input.credentialActive ? "verified"
    : input.onChain?.needs_provision ? "pending"
    : input.identityStatus === "earned" ? "pending"
    : "not_started";

  const reuseChecklist: ChecklistStatus =
    input.verifyState === "valid" ? "verified"
    : input.credentialActive ? "pending"
    : input.walletDone ? "optional"
    : "not_started";

  const items: PassportChecklistItem[] = [
    {
      id: "account",
      label: "Create account",
      detail: input.walletDone ? "Google sign-in complete" : "Sign in with Google",
      status: input.walletDone ? "verified" : "not_started",
      weight: 25,
      step: 1,
    },
    {
      id: "identity",
      label: "Verify identity",
      detail:
        input.identityStatus === "earned" ? "ID check approved"
        : input.identityStatus === "pending" ? "Documents in review"
        : input.identityStatus === "declined" ? "Not approved — try again"
        : "Optional until a deal requires it",
      status: identityChecklist,
      weight: 25,
      step: 2,
    },
    {
      id: "passport",
      label: "Get passport",
      detail:
        input.credentialActive && input.onChain?.stamps_complete ? "Credential + on-chain stamps"
        : input.credentialActive ? "Credential issued"
        : input.onChain?.needs_provision ? "Provisioning on-chain…"
        : "Issued after ID approval",
      status: passportChecklist,
      weight: 25,
      step: 3,
    },
    {
      id: "reuse",
      label: "Reuse anywhere",
      detail:
        input.verifyState === "valid" ? "Cryptographic proof verified"
        : input.credentialActive ? "Share verify link with partners"
        : "Portable proof for any protocol",
      status: reuseChecklist,
      weight: 25,
      step: 4,
    },
    {
      id: "intent",
      label: "Session confirmation",
      detail: input.intentProofs > 0 ? "Account confirmed" : "Optional security check",
      status: input.intentProofs > 0 ? "verified" : "optional",
      weight: 0,
    },
    {
      id: "business",
      label: "Business verified",
      detail: "For entity asset submissions",
      status: stampStatus(input.stamps.business),
      weight: 0,
    },
    {
      id: "asset_owner",
      label: "Asset owner",
      detail: "Title review per asset",
      status: stampStatus(input.stamps.asset_owner),
      weight: 0,
    },
  ];

  const core = items.filter(i => i.weight > 0);
  const earnedWeight = core.reduce((sum, item) => {
    if (item.status === "verified") return sum + item.weight;
    if (item.status === "pending") return sum + item.weight * 0.5;
    return sum;
  }, 0);

  return {
    percent: Math.round(earnedWeight),
    items,
    verifiedCount: items.filter(i => i.status === "verified").length,
    pendingCount: items.filter(i => i.status === "pending").length,
    optionalCount: items.filter(i => i.status === "optional").length,
  };
}

export const PASSPORT_FLOW_STEPS = [
  { id: 1 as const, key: "account", label: "Create account", sub: "Google · zkLogin" },
  { id: 2 as const, key: "identity", label: "Verify identity", sub: "Optional ID check" },
  { id: 3 as const, key: "passport", label: "Get passport", sub: "Credential issued" },
  { id: 4 as const, key: "reuse", label: "Reuse anywhere", sub: "Share verify link" },
] as const;

export function resolveFlowStep(completion: PassportCompletion): 1 | 2 | 3 | 4 {
  const core = completion.items.filter(i => i.step);
  const firstIncomplete = core.find(i => i.status !== "verified");
  return firstIncomplete?.step ?? 4;
}
