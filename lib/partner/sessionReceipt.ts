// FILE: lib/partner/sessionReceipt.ts
// Session-scoped decision receipt expiry for relying-party local sessions.

import type { PartnerPolicyRules } from "@/lib/policy/types";

const DEFAULT_SESSION_RECEIPT_HOURS = 24;

export function computeSessionReceiptExpiresAt(
  rules: PartnerPolicyRules,
  now = new Date(),
): string {
  const hours = rules.session_receipt_hours ?? DEFAULT_SESSION_RECEIPT_HOURS;
  return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
}

export function isSessionReceiptExpired(expiresAt: string | null | undefined, now = Date.now()): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() < now;
}
