// FILE: lib/passport/passportProgress.ts
// User-facing progress — outcomes, not internal tier numbers.

import type { PassportTierInput } from "@/lib/passport/passportTiers";

export interface ProgressStep {
  id: "account" | "wallet" | "identity";
  label: string;
  done: boolean;
  optional?: boolean;
}

export interface PassportProgressView {
  steps: ProgressStep[];
  completedRequired: number;
  requiredTotal: number;
  progressLine: string;
  statusLabel: string;
  primaryAction: "sign-in" | "add-wallet" | "verify-identity" | "ready";
  primaryActionLabel: string;
  unlockedSummary: string[];
}

const UNLOCKED_WALLET = [
  "Browse the public registry",
  "Use the Cielo verified-rate pilot",
  "Respond to partner requests that need wallet proof",
];

const UNLOCKED_IDENTITY = [
  "Enhanced-trust payments and asset submissions",
  "Partner policies that require identity assurance",
];

export function buildPassportProgress(input: PassportTierInput): PassportProgressView {
  const steps: ProgressStep[] = [
    { id: "account", label: "Account ready", done: input.accountActive },
    { id: "wallet", label: "Wallet connected", done: input.walletBound && input.walletBindingFresh },
    { id: "identity", label: "Identity confirmed", done: input.identityCredentialActive, optional: true },
  ];

  const required = steps.filter(s => !s.optional);
  const completedRequired = required.filter(s => s.done).length;
  const requiredTotal = required.length;

  let statusLabel = "Set up your Passport";
  let primaryAction: PassportProgressView["primaryAction"] = "sign-in";
  let primaryActionLabel = "Create Passport";
  const unlockedSummary: string[] = [];

  if (!input.accountActive) {
    statusLabel = "Not signed in";
    primaryAction = "sign-in";
    primaryActionLabel = "Sign in with Google";
  } else if (!input.walletBound || !input.walletBindingFresh) {
    statusLabel = "Account ready — connect a wallet";
    primaryAction = "add-wallet";
    primaryActionLabel = "Add wallet";
    unlockedSummary.push("Browse the public registry");
  } else if (!input.profileComplete) {
    statusLabel = "Finish wallet setup";
    primaryAction = "add-wallet";
    primaryActionLabel = "Complete wallet binding";
  } else {
    statusLabel = input.identityCredentialActive ? "Ready to use" : "Ready for pilot actions";
    primaryAction = input.identityCredentialActive ? "ready" : "verify-identity";
    primaryActionLabel = input.identityCredentialActive ? "Open Cielo pilot" : "Add identity when needed";
    unlockedSummary.push(...UNLOCKED_WALLET);
    if (input.identityCredentialActive) unlockedSummary.push(...UNLOCKED_IDENTITY);
  }

  const progressLine =
    completedRequired >= requiredTotal
      ? input.identityCredentialActive
        ? "All steps complete"
        : `${completedRequired} of ${requiredTotal} required · identity optional`
      : `${completedRequired} of ${requiredTotal} steps complete`;

  return {
    steps,
    completedRequired,
    requiredTotal,
    progressLine,
    statusLabel,
    primaryAction,
    primaryActionLabel,
    unlockedSummary,
  };
}
