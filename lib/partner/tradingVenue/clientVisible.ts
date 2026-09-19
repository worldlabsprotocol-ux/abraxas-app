// FILE: lib/partner/tradingVenue/clientVisible.ts
// Strip kit results to allow/deny, reason, action binding, and expiry.

import type { PartnerIntegrationOutcome } from "@/lib/partner/integrationKit/contract";
import type { PartnerKitSafeResult } from "@/lib/partner/integrationKit/client";
import {
  TRADING_VENUE_WALLET_BINDING_FUTURE,
  type TradingVenueActionBinding,
  type TradingVenueActionScope,
  type TradingVenueActionType,
  type TradingVenueSafeReasonCode,
} from "@/lib/partner/tradingVenue/contract";

export interface TradingVenueClientVisibleResult {
  allowed: boolean;
  reason: TradingVenueSafeReasonCode;
  action_binding: TradingVenueActionBinding;
  expires_at: string | null;
}

export function reasonFromOutcome(outcome: PartnerIntegrationOutcome): TradingVenueSafeReasonCode {
  switch (outcome) {
    case "permitted":
      return "permitted";
    case "denied":
      return "policy_denied";
    case "expired":
      return "receipt_expired";
    case "revoked":
      return "receipt_revoked";
    case "wrong_partner":
      return "partner_mismatch";
    case "wrong_policy":
    case "wrong_policy_version":
    case "policy_version_missing":
    case "policy_version_unknown":
    case "policy_version_draft":
    case "policy_version_deprecated":
    case "policy_version_not_yet_effective":
    case "policy_version_not_adopted":
      return "policy_mismatch";
    case "environment_mismatch":
      return "environment_mismatch";
    case "retry":
      return "retry";
    default:
      return "invalid";
  }
}

export function deniedVenueResult(
  reason: TradingVenueSafeReasonCode,
  actionType: TradingVenueActionType | "rejected",
  actionScope: string,
  nonceState: TradingVenueActionBinding["nonce_state"],
  expiresAt: string | null = null,
): TradingVenueClientVisibleResult {
  return {
    allowed: false,
    reason,
    action_binding: {
      action_type: actionType,
      action_scope: actionScope,
      nonce_state: nonceState,
      wallet_binding: TRADING_VENUE_WALLET_BINDING_FUTURE.status,
    },
    expires_at: expiresAt,
  };
}

export function permittedVenueResult(
  actionType: TradingVenueActionType,
  actionScope: TradingVenueActionScope,
  expiresAt: string,
): TradingVenueClientVisibleResult {
  return {
    allowed: true,
    reason: "permitted",
    action_binding: {
      action_type: actionType,
      action_scope: actionScope,
      nonce_state: "consumed",
      wallet_binding: TRADING_VENUE_WALLET_BINDING_FUTURE.status,
    },
    expires_at: expiresAt,
  };
}

export function toClientVisibleResult(
  result: PartnerKitSafeResult,
  actionType: TradingVenueActionType,
  actionScope: string,
  expiresAt: string | null,
): TradingVenueClientVisibleResult {
  const allowed = result.outcome === "permitted" && result.action === "permit";
  if (allowed) {
    return {
      allowed: true,
      reason: "permitted",
      action_binding: {
        action_type: actionType,
        action_scope: actionScope,
        nonce_state: "issued",
        wallet_binding: TRADING_VENUE_WALLET_BINDING_FUTURE.status,
      },
      expires_at: expiresAt,
    };
  }
  return deniedVenueResult(
    reasonFromOutcome(result.outcome),
    actionType,
    actionScope,
    "rejected",
    expiresAt,
  );
}

export function assertNoSensitiveVenueClientKeys(payload: unknown): string[] {
  const leaks: string[] = [];
  const blob = JSON.stringify(payload ?? null).toLowerCase();
  const needles = [
    "receipt_id",
    "dr_",
    "signature",
    "wallet_address",
    "email",
    "legal_name",
    "date_of_birth",
    "claim_ref",
    "evaluated_claim",
    "jwt",
    "id_token",
    "trading_history",
    "order_id",
    "fill_id",
  ];
  for (const needle of needles) {
    if (blob.includes(needle)) leaks.push(needle);
  }
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(blob)) leaks.push("email_like");
  return leaks;
}
