// FILE: lib/partner/partnerActivitySignal/contract.ts
// Privacy-safe partner-owned activity categories. Not wallet history or identity.

export const PARTNER_ACTIVITY_SIGNAL_ADAPTER_VERSION = "1.0.0" as const;

export const PARTNER_ACTIVITY_SIGNAL_TYPES = [
  "repeat_participant",
  "holder_loyalty",
  "high_activity",
] as const;
export type PartnerActivitySignalType = (typeof PARTNER_ACTIVITY_SIGNAL_TYPES)[number];

export const PARTNER_ACTIVITY_SIGNAL_SOURCES = ["partner_records"] as const;
export type PartnerActivitySignalSource = (typeof PARTNER_ACTIVITY_SIGNAL_SOURCES)[number];

export interface PartnerActivitySignal {
  type: PartnerActivitySignalType;
  source: PartnerActivitySignalSource;
  consent_recorded: true;
}

export const PARTNER_ACTIVITY_RECEIPT_REQUIREMENT = "current_public_receipt" as const;

export const PARTNER_ACTIVITY_NOT_ELIGIBILITY =
  "Partner activity categories supplement a current Abraxas receipt. They never replace hosted verification, policy evaluation, or receipt issuance.";

export const PARTNER_ACTIVITY_NO_RAW_DATA =
  "Abraxas accepts only a narrow, consented activity category derived from partner records. It never receives wallet history, balances, addresses, rankings, or other raw activity data.";

export const PARTNER_ACTIVITY_CLIENT_OVERRIDE_KEYS = [
  "wallet_address",
  "wallet",
  "address",
  "balance",
  "balances",
  "transaction",
  "transactions",
  "tx_history",
  "order",
  "orders",
  "position",
  "positions",
  "account_id",
  "email",
  "legal_name",
  "receipt",
  "receipt_id",
  "payload_hash",
  "signature",
  "policy_id",
  "policy_version",
  "partner_id",
  "environment",
  "production",
  "api_key",
  "allowed_categories",
  "activity_signal_type",
] as const;

export const PARTNER_ACTIVITY_BINDING_KEYS = [
  "partner_id",
  "policy_id",
  "policy_version",
  "receipt_id",
  "receipt_payload_hash",
  "activity_signal_type",
  "purpose",
  "action_scope",
  "environment",
  "issued_at",
  "expires_at",
  "nonce",
  "receipt_requirement",
] as const;

export const PARTNER_ACTIVITY_SAFE_REASON_CODES = [
  "permitted",
  "policy_denied",
  "receipt_expired",
  "receipt_revoked",
  "partner_mismatch",
  "policy_mismatch",
  "environment_mismatch",
  "activity_signal_missing",
  "activity_category_denied",
  "raw_activity_forbidden",
  "invalid_activity_signal",
  "receipt_binding_mismatch",
  "binding_expired",
  "replayed",
  "invalid",
  "retry",
  "store_unavailable",
] as const;
export type PartnerActivitySafeReasonCode = (typeof PARTNER_ACTIVITY_SAFE_REASON_CODES)[number];

export const PARTNER_ACTIVITY_CLIENT_VISIBLE_KEYS = [
  "allowed",
  "reason",
  "activity_binding",
  "expires_at",
] as const;

export const PARTNER_ACTIVITY_FORBIDDEN_CLIENT_KEYS = [
  "receipt",
  "receipt_id",
  "payload_hash",
  "signature",
  "wallet",
  "wallet_address",
  "balance",
  "transactions",
  "orders",
  "positions",
  "email",
  "legal_name",
  "evaluated_claim_refs",
] as const;

export function isPartnerActivitySignalType(value: string): value is PartnerActivitySignalType {
  return (PARTNER_ACTIVITY_SIGNAL_TYPES as readonly string[]).includes(value);
}

export function rejectPartnerActivityClientOverride(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return true;
  return Object.keys(body as Record<string, unknown>).some((key) =>
    (PARTNER_ACTIVITY_CLIENT_OVERRIDE_KEYS as readonly string[]).includes(key),
  );
}

export function validatePartnerActivitySignal(input: unknown):
  | { ok: true; signal: PartnerActivitySignal }
  | { ok: false; code: "invalid_activity_signal" | "raw_activity_forbidden" } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, code: "invalid_activity_signal" };
  }
  const body = input as Record<string, unknown>;
  const allowed = new Set(["type", "source", "consent_recorded"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) {
    return { ok: false, code: "raw_activity_forbidden" };
  }
  const type = typeof body.type === "string" ? body.type : "";
  if (!isPartnerActivitySignalType(type)
    || body.source !== "partner_records"
    || body.consent_recorded !== true) {
    return { ok: false, code: "invalid_activity_signal" };
  }
  return {
    ok: true,
    signal: {
      type,
      source: "partner_records",
      consent_recorded: true,
    },
  };
}
