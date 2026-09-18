// FILE: lib/partner/eventDelivery/contract.ts
// Versioned Partner Event Delivery schema. Notification only. Never PII.

export const PARTNER_EVENT_SCHEMA_VERSION = "2026-09-18" as const;

export const PARTNER_PRODUCTION_PUBLIC_EVENT_TYPES = [
  "receipt.issued",
  "receipt.revoked",
] as const;

export const PARTNER_EXTENDED_PUBLIC_EVENT_TYPES = [
  "receipt.expired",
  "decision.denied",
  "integration.health_changed",
] as const;

export const PARTNER_PUBLIC_EVENT_TYPES = [
  ...PARTNER_PRODUCTION_PUBLIC_EVENT_TYPES,
  ...PARTNER_EXTENDED_PUBLIC_EVENT_TYPES,
] as const;

export type PartnerPublicEventType = (typeof PARTNER_PUBLIC_EVENT_TYPES)[number];

export const PARTNER_EVENT_OUTCOMES = [
  "issued",
  "expired",
  "revoked",
  "denied",
  "health_changed",
] as const;

export type PartnerEventOutcome = (typeof PARTNER_EVENT_OUTCOMES)[number];

export const PARTNER_VISIBLE_DELIVERY_STATES = [
  "queued",
  "delivered",
  "retrying",
  "failed",
  "dead-lettered",
] as const;

export type PartnerVisibleDeliveryState = (typeof PARTNER_VISIBLE_DELIVERY_STATES)[number];

export const PARTNER_EVENT_SIGNATURE_METADATA = {
  alg: "HMAC-SHA256",
  version: "v1",
  header: "X-Abraxas-Webhook-Signature",
  timestamp_header: "X-Abraxas-Webhook-Timestamp",
  id_header: "X-Abraxas-Webhook-Id",
} as const;

export const PARTNER_EVENT_ALLOWED_KEYS = [
  "event_id",
  "schema_version",
  "event_type",
  "timestamp",
  "occurred_at",
  "partner_id",
  "policy_id",
  "policy_version",
  "receipt_id",
  "decision_id",
  "outcome",
  "reason_code",
  "signature",
] as const;

export const PARTNER_EVENT_PII_FORBIDDEN_KEYS = [
  "email",
  "oauth_sub",
  "wallet",
  "wallet_address",
  "sui_address",
  "subject_id",
  "subject_sui",
  "claims",
  "claims_json",
  "credential_jwt",
  "jwt",
  "id_token",
  "oauth_token",
  "document",
  "document_image",
  "image",
  "selfie",
  "biometric",
  "storage_path",
  "admin_note",
  "reviewer_note",
  "date_of_birth",
  "dob",
  "legal_name",
  "full_name",
  "given_name",
  "family_name",
  "profile",
  "user_profile",
] as const;

export const PARTNER_EVENT_ENDPOINT_REQUIREMENTS = [
  "HTTPS only. HTTP is rejected.",
  "No query strings, fragments, or userinfo in the URL.",
  "No localhost, link-local, or private IP destinations.",
  "Hostname must resolve to a public address at save time and at delivery time.",
  "Signing secret is shown once. Store it in your server secret manager.",
  "Webhook events are notifications. Fetch and verify the signed public receipt before granting access.",
  "Delivery is best effort with bounded retries. It is not guaranteed.",
] as const;

export const PARTNER_EVENT_NOT_AUTHORIZATION =
  "A webhook event is not authorization. Fetch GET /api/receipts/{id}/public and verify the signed receipt on your server before granting access.";

export function isPartnerPublicEventType(value: string): value is PartnerPublicEventType {
  return (PARTNER_PUBLIC_EVENT_TYPES as readonly string[]).includes(value);
}

export function outcomeForPublicEventType(eventType: PartnerPublicEventType): PartnerEventOutcome {
  switch (eventType) {
    case "receipt.issued":
      return "issued";
    case "receipt.expired":
      return "expired";
    case "receipt.revoked":
      return "revoked";
    case "decision.denied":
      return "denied";
    case "integration.health_changed":
      return "health_changed";
  }
}
