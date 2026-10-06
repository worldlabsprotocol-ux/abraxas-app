// FILE: lib/partner/holderExperience/recovery.ts
// Recoverable holder states. Safe next actions. No raw backend text.

import { HOLDER_PASSPORT_HREF, type HolderNextAction, type HolderRecoveryState } from "./contract";

export interface HolderRecoveryView {
  state: HolderRecoveryState;
  title: string;
  explanation: string;
  next_action: HolderNextAction;
  next_label: string;
  href?: string;
}

const VIEWS: Record<HolderRecoveryState, Omit<HolderRecoveryView, "state">> = {
  loading: {
    title: "Preparing this request",
    explanation: "Abraxas is loading the partner request. Keep this tab open.",
    next_action: "restart_partner_link",
    next_label: "Wait, or restart from the partner link",
  },
  expired: {
    title: "This request expired",
    explanation: "The verification link is no longer active. Start again from the partner’s verification link.",
    next_action: "restart_partner_link",
    next_label: "Restart from the partner link",
  },
  missing: {
    title: "This request could not be found",
    explanation: "The verification link is incomplete or no longer available. Return to the partner site and open a new verification link.",
    next_action: "restart_partner_link",
    next_label: "Restart from the partner link",
  },
  cancelled: {
    title: "This request was cancelled",
    explanation: "No result was shared. If you still need access, start again from the partner’s verification link.",
    next_action: "restart_partner_link",
    next_label: "Restart from the partner link",
  },
  denied: {
    title: "We couldn't confirm this request",
    explanation: "Abraxas could not verify the required eligibility for this request. If you think this is a mistake, contact the requesting partner.",
    next_action: "contact_requesting_partner",
    next_label: "Try again",
  },
  invalid_binding: {
    title: "We couldn't return you to the requesting service",
    explanation: "Your verification result was not redirected somewhere unexpected. Restart from the partner's verification link to try again.",
    next_action: "restart_partner_link",
    next_label: "Try again",
  },
  session_required: {
    title: "Sign in to continue",
    explanation: "Your session ended. Sign in again. Google only opens an Abraxas account. It does not prove eligibility.",
    next_action: "sign_in_again",
    next_label: "Sign in again",
    href: HOLDER_PASSPORT_HREF,
  },
  method_not_qualified: {
    title: "Choose a qualifying method first",
    explanation: "Selecting a method is not enough. Finish the qualifying method this policy allows. That step does not issue a result or reveal consent.",
    next_action: "choose_qualifying_method",
    next_label: "Choose or complete a qualifying method",
  },
  provider_unavailable: {
    title: "This verification method is unavailable",
    explanation: "A required provider is not available here. Choose another qualifying method, return to Passport, or contact the requesting partner.",
    next_action: "return_to_passport",
    next_label: "Return to Passport",
    href: HOLDER_PASSPORT_HREF,
  },
  approved: {
    title: "Confirmed",
    explanation: "The requesting service received only the approved result. Your private evidence stayed with you.",
    next_action: "contact_requesting_partner",
    next_label: "Continue to service",
  },
  sandbox_approved: {
    title: "Confirmed — test request",
    explanation: "The requesting service received only the approved sandbox result. This cannot be used as a production verification.",
    next_action: "contact_requesting_partner",
    next_label: "Continue to service",
  },
};

export const HOLDER_RETURN_FAILURE_TECHNICAL =
  "Abraxas only returns to the destination registered with the original request. Query parameters cannot override that return URL.";

export function resolveHolderRecovery(
  state: HolderRecoveryState,
  partnerName?: string,
  storedPartnerHome?: string | null,
): HolderRecoveryView {
  const base = VIEWS[state];
  const partner = partnerName?.trim() || "the requesting partner";
  const view: HolderRecoveryView = {
    state,
    ...base,
    explanation: base.explanation.replace(/the requesting partner/g, partner).replace(/the partner’s/g, `${partner}’s`),
    next_label: base.next_label.replace(/the requesting partner/g, partner),
  };
  if (
    !view.href
    && storedPartnerHome
    && (view.next_action === "restart_partner_link" || view.next_action === "contact_requesting_partner")
  ) {
    view.href = storedPartnerHome;
  }
  return view;
}

export function holderSafeClientMessage(_raw?: unknown): string {
  return "Something went wrong. Try again from the partner’s verification link, or return to Passport.";
}

export function holderCopyLeaks(text: string): string[] {
  const hits: string[] = [];
  if (/abx_(test|live|whsec)_/i.test(text)) hits.push("api_key");
  if (/receipt[_-]?id/i.test(text)) hits.push("receipt_id");
  if (/0x[a-f0-9]{20,}/i.test(text)) hits.push("wallet");
  if (/date of birth|legal name|email@/i.test(text) && /shared with/i.test(text)) hits.push("pii_shared");
  if (/SQLSTATE|relation |oauth token|jwt /i.test(text)) hits.push("backend");
  return hits;
}
