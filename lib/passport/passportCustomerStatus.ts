// FILE: lib/passport/passportCustomerStatus.ts
// Customer-readable Passport status — no assurance enums or technical labels.

import type { PassportSetupState } from "@/lib/idv/identityVerificationStates";
import type { IdentityStampStatus } from "@/lib/hooks/usePassportVerification";
import { resolveIdentityUiState, type IdentityUiState } from "@/lib/passport/identityUiState";

export type PassportCustomerStatusLabel =
  | "Setup needed"
  | "Ready to use"
  | "Verification required";

export interface PassportCustomerStatus {
  label: PassportCustomerStatusLabel;
  summary: string;
  identityUi: IdentityUiState;
}

export function resolvePassportCustomerStatus(input: {
  walletDone: boolean;
  setup: PassportSetupState;
  identityStatus: IdentityStampStatus;
  hasCredential: boolean;
  idvProvider: "veriff" | "manual";
  via: string | null;
}): PassportCustomerStatus {
  const identityUi = resolveIdentityUiState({
    identityStatus: input.identityStatus,
    hasCredential: input.hasCredential,
    idvProvider: input.idvProvider,
    via: input.via,
  });

  if (!input.walletDone || !input.setup.walletBound) {
    return {
      label: "Setup needed",
      summary: "Sign in and secure your Passport to get started.",
      identityUi,
    };
  }

  if (identityUi === "under_review" || identityUi === "needs_action") {
    return {
      label: "Verification required",
      summary: identityUi === "under_review"
        ? "Your verified information is being reviewed."
        : "A participating service needs updated verified information.",
      identityUi,
    };
  }

  return {
    label: "Ready to use",
    summary: identityUi === "verified"
      ? "Your Passport is ready when participating services request proof."
      : "Your account is secured. Verified information is only required when a service asks for it.",
    identityUi,
  };
}

export function buildPassportProofSummary(input: {
  walletBound: boolean;
  identityUi: IdentityUiState;
}): string[] {
  const items = [
    input.walletBound
      ? "Your account is securely connected"
      : "Secure account connection needed",
  ];

  if (input.identityUi === "verified") {
    items.push("Verified information is ready when a service requests it");
  } else if (input.identityUi === "under_review") {
    items.push("Verified information is being reviewed");
  } else if (input.identityUi === "needs_action") {
    items.push("Verified information needs an update");
  } else {
    items.push("A service will ask only if verified information is required");
  }

  return items;
}
