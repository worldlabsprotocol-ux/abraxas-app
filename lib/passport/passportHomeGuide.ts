// FILE: lib/passport/passportHomeGuide.ts
// One plain-language next action for the Passport home screen.

import type { IdentityUiState } from "@/lib/passport/identityUiState";

export interface PassportHomeGuide {
  eyebrow: string;
  title: string;
  summary: string;
  action_label: string;
  action_href: string;
}

export function resolvePassportHomeGuide(input: {
  walletBound: boolean;
  identityUi: IdentityUiState;
  identityRequired: boolean;
}): PassportHomeGuide {
  if (!input.walletBound) {
    return {
      eyebrow: "Next step",
      title: "Secure your Passport",
      summary: "Confirm this account once. No funds move and no purchase is made.",
      action_label: "Secure your Passport",
      action_href: "#passport-secure-heading",
    };
  }

  if (input.identityRequired && input.identityUi === "under_review") {
    return {
      eyebrow: "In progress",
      title: "Your information is under review",
      summary: "There is nothing else to submit right now. We will update your Passport when review finishes.",
      action_label: "View activity",
      action_href: "/passport?view=activity",
    };
  }

  if (
    input.identityRequired
    && (input.identityUi === "not_started" || input.identityUi === "needs_action")
  ) {
    return {
      eyebrow: input.identityUi === "needs_action" ? "Action needed" : "Next step",
      title: input.identityUi === "needs_action"
        ? "Update your verified information"
        : "Add the information this service needs",
      summary: "Abraxas shares the eligibility result with the service, not your private documents.",
      action_label: input.identityUi === "needs_action" ? "Update information" : "Add verified information",
      action_href: "#passport-identity-action",
    };
  }

  return {
    eyebrow: "Ready",
    title: input.identityUi === "verified" ? "Your Passport is ready to reuse" : "Your Passport is ready",
    summary: input.identityUi === "verified"
      ? "Use it with participating services and review every shared result from your activity."
      : "Verified information is optional until a participating service asks for it.",
    action_label: "View activity",
    action_href: "/passport?view=activity",
  };
}
