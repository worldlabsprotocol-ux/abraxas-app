// FILE: lib/partner/tradingVenue/presentation.ts
// Human-readable copy for client-visible venue preflight results.

import type {
  TradingVenueClientVisibleResult,
} from "@/lib/partner/tradingVenue/clientVisible";
import type {
  TradingVenueSafeReasonCode,
} from "@/lib/partner/tradingVenue/contract";

export type VenueResultTone = "success" | "attention" | "blocked";

export interface VenueResultPresentation {
  title: string;
  summary: string;
  tone: VenueResultTone;
}

const REASON_COPY: Record<TradingVenueSafeReasonCode, VenueResultPresentation> = {
  permitted: {
    title: "Access check passed",
    summary: "This one sandbox market-access action may continue.",
    tone: "success",
  },
  policy_denied: {
    title: "Access is not available",
    summary: "The current verification result does not meet this venue policy.",
    tone: "blocked",
  },
  receipt_expired: {
    title: "Verification needs refreshing",
    summary: "The receipt expired. Run the verification flow again before continuing.",
    tone: "attention",
  },
  receipt_revoked: {
    title: "Verification is no longer valid",
    summary: "The receipt was revoked and cannot be used for market access.",
    tone: "blocked",
  },
  partner_mismatch: {
    title: "Receipt belongs to another service",
    summary: "Use a receipt issued for this partner before continuing.",
    tone: "blocked",
  },
  policy_mismatch: {
    title: "Receipt does not match this policy",
    summary: "Run the current venue policy before continuing.",
    tone: "blocked",
  },
  environment_mismatch: {
    title: "Environment does not match",
    summary: "Use a sandbox receipt for this sandbox access check.",
    tone: "blocked",
  },
  action_mismatch: {
    title: "Action does not match",
    summary: "The receipt and action contract do not authorize this market-access action.",
    tone: "blocked",
  },
  action_expired: {
    title: "Access request expired",
    summary: "Create a new one-time access request and try again.",
    tone: "attention",
  },
  replayed: {
    title: "Replay blocked",
    summary: "This one-time authorization was already used. Create a new access request.",
    tone: "success",
  },
  wallet_binding_missing: {
    title: "Wallet confirmation needed",
    summary: "Confirm the wallet selected for this access request.",
    tone: "attention",
  },
  wallet_binding_expired: {
    title: "Wallet confirmation expired",
    summary: "Confirm the wallet again before continuing.",
    tone: "attention",
  },
  wallet_binding_mismatch: {
    title: "Wallet does not match",
    summary: "Use the wallet confirmed for this access request.",
    tone: "blocked",
  },
  wallet_binding_replayed: {
    title: "Wallet confirmation already used",
    summary: "Create a new wallet confirmation before continuing.",
    tone: "blocked",
  },
  wallet_binding_cross_partner: {
    title: "Wallet confirmation belongs to another service",
    summary: "Confirm the wallet through this partner flow.",
    tone: "blocked",
  },
  store_unavailable: {
    title: "Access check is temporarily unavailable",
    summary: "The replay-protection store could not be reached. Try again shortly.",
    tone: "attention",
  },
  profile_unknown: {
    title: "Venue profile is not configured",
    summary: "Select a supported server-side venue profile before running this check.",
    tone: "blocked",
  },
  profile_disabled: {
    title: "Venue profile is disabled",
    summary: "This integration cannot run until the venue profile is enabled.",
    tone: "blocked",
  },
  profile_planned: {
    title: "Venue profile is still planned",
    summary: "This profile does not have an active sandbox access path yet.",
    tone: "attention",
  },
  profile_mismatch: {
    title: "Venue profile does not match",
    summary: "Use the server-configured profile for this access request.",
    tone: "blocked",
  },
  invalid: {
    title: "Access check could not run",
    summary: "The request was incomplete or invalid. Start a new access check.",
    tone: "blocked",
  },
  retry: {
    title: "Try the access check again",
    summary: "The verification service could not return a final result.",
    tone: "attention",
  },
};

export function presentVenueResult(
  result: TradingVenueClientVisibleResult,
): VenueResultPresentation {
  if (result.allowed) return REASON_COPY.permitted;
  return REASON_COPY[result.reason] ?? REASON_COPY.invalid;
}
