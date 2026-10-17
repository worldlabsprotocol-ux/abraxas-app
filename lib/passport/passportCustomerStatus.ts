// FILE: lib/passport/passportCustomerStatus.ts
// Customer-readable Passport status — no assurance enums or technical labels.

import type { PassportSetupState } from "@/lib/idv/identityVerificationStates";
import type { IdentityStampStatus } from "@/lib/hooks/usePassportVerification";
import { resolveIdentityUiState, type IdentityUiState } from "@/lib/passport/identityUiState";
import type { PassportBrowserSessionState } from "@/lib/passport/passportBrowserSessionAuth";

export type PassportCustomerStatusLabel =
  | "Sign in to continue"
  | "Secure your account"
  | "Ready to reuse"
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
  browserSessionState?: PassportBrowserSessionState;
}): PassportCustomerStatus {
  const identityUi = resolveIdentityUiState({
    identityStatus: input.identityStatus,
    hasCredential: input.hasCredential,
    idvProvider: input.idvProvider,
    via: input.via,
  });

  if (
    input.walletDone
    && (input.browserSessionState === "reauthentication_required"
      || input.browserSessionState === "session_probe_failed")
  ) {
    return {
      label: "Sign in to continue",
      summary: "Your Abraxas account is remembered here. Renew your secure session to manage Passport.",
      identityUi,
    };
  }

  if (!input.walletDone) {
    return {
      label: "Secure your account",
      summary: "Sign in to open Passport and connect your account.",
      identityUi,
    };
  }

  if (!input.setup.walletBound) {
    return {
      label: "Secure your account",
      summary: "Confirm account security before sharing private proof with partners.",
      identityUi,
    };
  }

  if (identityUi === "under_review" || identityUi === "needs_action") {
    return {
      label: "Verification required",
      summary: identityUi === "under_review"
        ? "Your verified information is being reviewed."
        : "A partner needs updated verified information before you can continue.",
      identityUi,
    };
  }

  return {
    label: "Ready to reuse",
    summary: identityUi === "verified"
      ? "Your Passport can answer eligible partner requests without sharing underlying identity data."
      : "Your account is secured. Verified information is only required when a partner asks for it.",
    identityUi,
  };
}

export function buildPassportProofSummary(input: {
  walletBound: boolean;
  identityUi: IdentityUiState;
  browserSessionReady?: boolean;
}): string[] {
  const items: string[] = [];

  if (input.browserSessionReady === false) {
    items.push("Secure session renewal required");
  } else {
    items.push(
      input.walletBound
        ? "Your account is securely connected"
        : "Secure account connection needed",
    );
  }

  if (input.identityUi === "verified") {
    items.push("Ready for eligible partner requests");
  } else if (input.identityUi === "under_review") {
    items.push("Verified information is being reviewed");
  } else if (input.identityUi === "needs_action") {
    items.push("Needs attention before some partner requests");
  } else {
    items.push("Verified only when a partner requires it");
  }

  return items;
}
