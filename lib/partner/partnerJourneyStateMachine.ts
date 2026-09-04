// FILE: lib/partner/partnerJourneyStateMachine.ts
// Authoritative partner journey states — UI derives from server results, never URL approval.

import type { PartnerFlowNextStep } from "@/lib/partner/relyingPartyFlow";

export const PARTNER_JOURNEY_STATES = [
  "request_received",
  "sign_in_required",
  "sign_in_in_progress",
  "session_ready",
  "evaluating_policy",
  "additional_verification_required",
  "manual_review_required",
  "approved",
  "denied",
  "returning_to_partner",
  "return_failed",
] as const;

export type PartnerJourneyState = (typeof PARTNER_JOURNEY_STATES)[number];

export type PartnerJourneyPrimaryAction =
  | "sign_in"
  | "continue"
  | "return_to_partner"
  | "try_again"
  | "none";

export interface PartnerJourneyPresentation {
  state: PartnerJourneyState;
  customer_message: string;
  primary_action: PartnerJourneyPrimaryAction;
  primary_label: string | null;
  terminal: boolean;
  safe_retry: boolean;
  telemetry_outcome: string;
}

export interface PartnerJourneyServerSnapshot {
  next?: PartnerFlowNextStep | null;
  authenticated?: boolean;
  sign_in_in_progress?: boolean;
  evaluating?: boolean;
  returning?: boolean;
  return_blocked?: boolean;
  invalid_request?: boolean;
  partner_display_name?: string;
}

const MESSAGES: Record<PartnerJourneyState, Omit<PartnerJourneyPresentation, "state">> = {
  request_received: {
    customer_message: "Preparing your verification request…",
    primary_action: "none",
    primary_label: null,
    terminal: false,
    safe_retry: false,
    telemetry_outcome: "request_received",
  },
  sign_in_required: {
    customer_message: "Sign in to continue. Signing in confirms your account — it does not verify your age.",
    primary_action: "sign_in",
    primary_label: "Continue with Google",
    terminal: false,
    safe_retry: true,
    telemetry_outcome: "sign_in_required",
  },
  sign_in_in_progress: {
    customer_message: "Signing you in securely…",
    primary_action: "none",
    primary_label: null,
    terminal: false,
    safe_retry: false,
    telemetry_outcome: "sign_in_in_progress",
  },
  session_ready: {
    customer_message: "Your session is ready. Checking what this partner needs…",
    primary_action: "none",
    primary_label: null,
    terminal: false,
    safe_retry: false,
    telemetry_outcome: "session_ready",
  },
  evaluating_policy: {
    customer_message: "Checking the partner requirement…",
    primary_action: "none",
    primary_label: null,
    terminal: false,
    safe_retry: false,
    telemetry_outcome: "evaluating_policy",
  },
  additional_verification_required: {
    customer_message:
      "One more step is required before we can share a result with the partner. This may include identity verification — not just signing in.",
    primary_action: "continue",
    primary_label: "Continue verification",
    terminal: false,
    safe_retry: true,
    telemetry_outcome: "additional_verification_required",
  },
  manual_review_required: {
    customer_message:
      "Your verification is under review. You can close this window and return to the partner later.",
    primary_action: "return_to_partner",
    primary_label: null,
    terminal: true,
    safe_retry: false,
    telemetry_outcome: "manual_review_required",
  },
  approved: {
    customer_message: "Approved. Returning you to the partner now…",
    primary_action: "none",
    primary_label: null,
    terminal: false,
    safe_retry: false,
    telemetry_outcome: "approved",
  },
  denied: {
    customer_message:
      "This requirement could not be met for your account. Contact the partner if you believe this is an error.",
    primary_action: "return_to_partner",
    primary_label: null,
    terminal: true,
    safe_retry: true,
    telemetry_outcome: "denied",
  },
  returning_to_partner: {
    customer_message: "Returning you to the partner…",
    primary_action: "none",
    primary_label: null,
    terminal: false,
    safe_retry: false,
    telemetry_outcome: "returning_to_partner",
  },
  return_failed: {
    customer_message:
      "We could not return you automatically. Use the button below to go back to the partner.",
    primary_action: "return_to_partner",
    primary_label: null,
    terminal: true,
    safe_retry: true,
    telemetry_outcome: "return_failed",
  },
};

export function resolvePartnerJourneyPresentation(
  state: PartnerJourneyState,
  overrides?: Partial<Pick<PartnerJourneyPresentation, "customer_message" | "primary_label">>,
): PartnerJourneyPresentation {
  const base = MESSAGES[state];
  return {
    state,
    ...base,
    customer_message: overrides?.customer_message ?? base.customer_message,
    primary_label: overrides?.primary_label ?? base.primary_label,
  };
}

export function mapServerSnapshotToJourneyState(
  snapshot: PartnerJourneyServerSnapshot,
): PartnerJourneyState {
  if (snapshot.invalid_request) return "return_failed";
  if (snapshot.return_blocked) return "return_failed";
  if (snapshot.returning) return "returning_to_partner";
  if (snapshot.sign_in_in_progress) return "sign_in_in_progress";
  if (!snapshot.authenticated) return "sign_in_required";
  if (snapshot.evaluating) return "evaluating_policy";
  if (snapshot.next === "authenticate") return "sign_in_required";
  if (snapshot.next === "passport") return "additional_verification_required";
  if (snapshot.next === "pending_review") return "manual_review_required";
  if (snapshot.next === "denied") return "denied";
  if (snapshot.next === "enter") return "approved";
  if (snapshot.authenticated && !snapshot.next) return "session_ready";
  return "request_received";
}

export function mapFlowNextStepToJourneyState(next: PartnerFlowNextStep): PartnerJourneyState {
  switch (next) {
    case "authenticate": return "sign_in_required";
    case "passport": return "additional_verification_required";
    case "enter": return "approved";
    case "denied": return "denied";
    case "pending_review": return "manual_review_required";
    default: return "evaluating_policy";
  }
}

export function partnerJourneyPartnerIntro(partnerName: string): string {
  return `${partnerName} uses Abraxas to confirm this requirement without collecting more personal information than necessary.`;
}
