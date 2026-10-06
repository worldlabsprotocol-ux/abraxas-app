import type { PartnerWebhookPayload } from "./types.js";

export const WEBHOOK_PII_FORBIDDEN_KEYS = [
  "email",
  "legal_name",
  "date_of_birth",
  "dob",
  "wallet",
  "wallet_address",
  "credential_jwt",
  "selfie",
  "document",
] as const;

export function webhookPayloadHasNoPii(payload: PartnerWebhookPayload): boolean {
  const text = JSON.stringify(payload).toLowerCase();
  return !WEBHOOK_PII_FORBIDDEN_KEYS.some((key) => text.includes(key));
}

export const PARTNER_EVENT_NOT_AUTHORIZATION =
  "Webhook delivery is notification only. Re-fetch and verify the public receipt before granting access.";
