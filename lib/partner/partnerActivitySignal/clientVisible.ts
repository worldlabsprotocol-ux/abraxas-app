// FILE: lib/partner/partnerActivitySignal/clientVisible.ts
// Allow/deny surface for partner activity preflight.

import type {
  PartnerActivitySafeReasonCode,
  PartnerActivitySignalType,
} from "./contract";

export interface PartnerActivityBindingState {
  activity_signal_type: PartnerActivitySignalType | "rejected";
  action_scope: string;
  nonce_state: "consumed" | "replayed" | "rejected";
  receipt_bound: boolean;
}

export interface PartnerActivityClientVisibleResult {
  allowed: boolean;
  reason: PartnerActivitySafeReasonCode;
  activity_binding: PartnerActivityBindingState;
  expires_at: string | null;
}

export function deniedActivityResult(
  reason: PartnerActivitySafeReasonCode,
  actionScope: string,
  nonceState: PartnerActivityBindingState["nonce_state"] = "rejected",
  expiresAt: string | null = null,
): PartnerActivityClientVisibleResult {
  return {
    allowed: false,
    reason,
    activity_binding: {
      activity_signal_type: "rejected",
      action_scope: actionScope,
      nonce_state: nonceState,
      receipt_bound: false,
    },
    expires_at: expiresAt,
  };
}

export function permittedActivityResult(
  activityType: PartnerActivitySignalType,
  actionScope: string,
  expiresAt: string,
): PartnerActivityClientVisibleResult {
  return {
    allowed: true,
    reason: "permitted",
    activity_binding: {
      activity_signal_type: activityType,
      action_scope: actionScope,
      nonce_state: "consumed",
      receipt_bound: true,
    },
    expires_at: expiresAt,
  };
}

export function assertNoSensitiveActivityClientKeys(payload: unknown): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return ["invalid"];
  const leaks: string[] = [];
  for (const key of Object.keys(payload as Record<string, unknown>)) {
    if (["receipt_id", "payload_hash", "wallet_address", "balance", "transactions"].includes(key)) {
      leaks.push(key);
    }
  }
  return leaks;
}
