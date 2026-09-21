// FILE: lib/partner/receiptLifecycle/envelope.ts
// Safe lifecycle envelope. Selective-disclosure serialization only.

import { createHash } from "node:crypto";
import { pickAllowedKeys } from "@/lib/privacy/selectiveDisclosure/enforce";
import { detectDisclosureLeaks } from "@/lib/privacy/selectiveDisclosure/leakDetector";
import {
  RECEIPT_LIFECYCLE_NOT_GRANT,
  RECEIPT_LIFECYCLE_SCHEMA_VERSION,
  isReceiptLifecycleEventType,
  validityClassForLifecycleEvent,
  type ReceiptLifecycleEventType,
  type ReceiptLifecycleValidityClass,
} from "./contract";

export const RECEIPT_LIFECYCLE_ENVELOPE_KEYS = [
  "event_ref",
  "event_type",
  "occurred_at",
  "policy_id",
  "policy_version",
  "validity_class",
  "expires_at",
  "must_reverify",
  "is_grant",
  "instruction",
] as const;

export interface ReceiptLifecycleEnvelope {
  event_ref: string;
  event_type: ReceiptLifecycleEventType;
  occurred_at: string;
  policy_id: string | null;
  policy_version: number | null;
  validity_class: ReceiptLifecycleValidityClass;
  expires_at: string | null;
  must_reverify: true;
  is_grant: false;
  instruction: typeof RECEIPT_LIFECYCLE_NOT_GRANT;
}

export function opaqueLifecycleEventRef(seed: string): string {
  return `evt_${createHash("sha256").update(`lifecycle:${seed}`).digest("hex").slice(0, 16)}`;
}

export function buildReceiptLifecycleEnvelope(input: {
  eventId: string;
  eventType: ReceiptLifecycleEventType;
  occurredAt: string;
  policyId?: string | null;
  policyVersion?: number | null;
  expiresAt?: string | null;
}): ReceiptLifecycleEnvelope {
  return {
    event_ref: opaqueLifecycleEventRef(input.eventId),
    event_type: input.eventType,
    occurred_at: input.occurredAt,
    policy_id: input.policyId ?? null,
    policy_version: typeof input.policyVersion === "number" ? input.policyVersion : null,
    validity_class: validityClassForLifecycleEvent(input.eventType),
    expires_at: input.eventType === "receipt.expiring" || input.eventType === "receipt.issued"
      ? input.expiresAt ?? null
      : null,
    must_reverify: true,
    is_grant: false,
    instruction: RECEIPT_LIFECYCLE_NOT_GRANT,
  };
}

export function projectLifecycleFixture(eventType: ReceiptLifecycleEventType): ReceiptLifecycleEnvelope {
  return buildReceiptLifecycleEnvelope({
    eventId: `fixture:${eventType}`,
    eventType,
    occurredAt: "2026-09-21T00:00:00.000Z",
    policyId: "sandbox-policy",
    policyVersion: 1,
    expiresAt: eventType === "receipt.expiring" ? "2026-09-22T00:00:00.000Z" : null,
  });
}

export function lifecycleEnvelopeLeaks(payload: unknown): string[] {
  const blob = JSON.stringify(payload).toLowerCase();
  const leaks: string[] = [];
  for (const needle of [
    "callback_url",
    "return_url",
    "wallet_address",
    "date_of_birth",
    "legal_name",
    "oauth_token",
    "id_token",
    "private_key",
    "abx_live_",
    "abx_whsec_",
    "source_receipt",
    "claims_json",
    "provider_payload",
    "sqlstate",
  ]) {
    if (blob.includes(needle)) leaks.push(needle);
  }
  if (detectDisclosureLeaks(payload).length) leaks.push("disclosure");
  return leaks;
}

export function sanitizeLifecycleEnvelope(payload: ReceiptLifecycleEnvelope): ReceiptLifecycleEnvelope {
  const picked = pickAllowedKeys(payload, RECEIPT_LIFECYCLE_ENVELOPE_KEYS) as ReceiptLifecycleEnvelope;
  if (!isReceiptLifecycleEventType(picked.event_type)) {
    throw Object.assign(new Error("event_type_not_supported"), { code: "event_type_not_supported" });
  }
  return picked;
}
