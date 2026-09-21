// FILE: lib/partner/receiptLifecycle/contract.ts
// Receipt lifecycle events. Notifications only. Never a grant.

export const RECEIPT_LIFECYCLE_SCHEMA_VERSION = "1.0.0" as const;
export const RECEIPT_LIFECYCLE_DOCS = "/docs/receipt-lifecycle-events" as const;
export const RECEIPT_LIFECYCLE_SWEEP_PATH = "/api/cron/receipt-lifecycle-sweep" as const;
export const RECEIPT_LIFECYCLE_EXPIRING_WINDOW_MS = 24 * 60 * 60 * 1000;
export const RECEIPT_LIFECYCLE_SWEEP_LIMIT = 40;

export const RECEIPT_LIFECYCLE_EVENT_TYPES = [
  "receipt.issued",
  "receipt.expiring",
  "receipt.revoked",
  "receipt.invalidated",
] as const;
export type ReceiptLifecycleEventType = (typeof RECEIPT_LIFECYCLE_EVENT_TYPES)[number];

export const RECEIPT_LIFECYCLE_VALIDITY_CLASSES = [
  "current",
  "expiring",
  "expired",
  "revoked",
  "invalidated",
] as const;
export type ReceiptLifecycleValidityClass = (typeof RECEIPT_LIFECYCLE_VALIDITY_CLASSES)[number];

export const RECEIPT_LIFECYCLE_TERMINAL_TYPES = ["receipt.revoked", "receipt.invalidated"] as const;

export const RECEIPT_LIFECYCLE_NOT_GRANT =
  "A lifecycle webhook is not a grant. Verify HMAC, re-fetch the current public receipt, then verify it with Partner Kit before any named partner action.";

export const RECEIPT_LIFECYCLE_SCHEDULING_POSTURE =
  "Webhook dispatch is scheduled in vercel.json. Expiry notices require configured scheduling of /api/cron/receipt-lifecycle-sweep. That sweep is not listed in the deployed cron set.";

export const RECEIPT_LIFECYCLE_CHECKLIST = [
  {
    id: "verify_hmac",
    title: "Verify webhook HMAC",
    detail: "Validate X-Abraxas-Webhook-Signature on your server. Reject unsigned or stale events.",
  },
  {
    id: "refetch_receipt",
    title: "Re-fetch the public receipt",
    detail: "Use the receipt reference to GET the current public receipt. The webhook body is not the receipt.",
  },
  {
    id: "verify_kit",
    title: "Verify with Partner Kit",
    detail: "Call Partner Kit verification and evaluate currently_valid on your backend before any named action.",
  },
  {
    id: "named_action",
    title: "Apply only the named action",
    detail: "A delivered event never authorizes access, payment, trade, or Production activation by itself.",
  },
] as const;

export const RECEIPT_LIFECYCLE_HOLDER_NOTICE =
  "Partners may be notified that this result is no longer valid. They do not receive your evidence.";

export function validityClassForLifecycleEvent(
  eventType: ReceiptLifecycleEventType,
): ReceiptLifecycleValidityClass {
  switch (eventType) {
    case "receipt.issued":
      return "current";
    case "receipt.expiring":
      return "expiring";
    case "receipt.revoked":
      return "revoked";
    case "receipt.invalidated":
      return "invalidated";
  }
}

export function isReceiptLifecycleEventType(value: string): value is ReceiptLifecycleEventType {
  return (RECEIPT_LIFECYCLE_EVENT_TYPES as readonly string[]).includes(value);
}
