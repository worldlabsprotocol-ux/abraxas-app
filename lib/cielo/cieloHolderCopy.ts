// FILE: lib/cielo/cieloHolderCopy.ts
// Human-facing copy for Cielo verified-guest flow (canonical ids stay internal).

import { CIELO_V1_DISCLOSED_RESULT } from "@/lib/cielo/cieloVerifiedGuestPolicyContract";

export function humanizeCieloDisclosedResult(machine: string | null | undefined): string {
  if (machine === CIELO_V1_DISCLOSED_RESULT || machine === "verified_guest_pilot_pass") {
    return "Guest eligibility check passed";
  }
  if (machine === "age_eligible_21") {
    return "Age requirement met";
  }
  return machine?.replace(/_/g, " ") ?? "Eligibility result";
}

export const CIELO_HOLDER_COPY = {
  flowTitle: "Request verified guest access",
  flowLead:
    "Cielo Sunrise can review a verified guest request through Abraxas. This is not a booking, payment, or reservation.",
  stepAccount: "Your Abraxas account",
  stepConsent: "Review & consent",
  stepSubmit: "Send request to Cielo",
  signIn: "Continue with Google",
  continueConsent: "Continue to review",
  submit: "Send verified guest request",
  notBooking: "Operator review is separate from Airbnb booking or payment.",
  technicalDetails: "What is verified?",
} as const;

export const CIELO_STEP_LABELS: Record<string, string> = {
  "missing:account": "Sign in to create your Abraxas account",
  "missing:profile": "Add a username or display name on your profile",
  "missing:wallet_binding": "Confirm wallet control with a fresh signature",
  "stale:wallet_binding": "Re-confirm wallet control (signature older than 30 days)",
  "missing:consent": "Approve consent for this request",
};

export function humanizeCieloReason(code: string): string {
  if (CIELO_STEP_LABELS[code]) return CIELO_STEP_LABELS[code];
  if (code.startsWith("missing:")) {
    return `Complete: ${code.replace("missing:", "").replace(/_/g, " ")}`;
  }
  return code.replace(/_/g, " ");
}
