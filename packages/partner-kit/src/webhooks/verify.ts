import { verifyWebhookSignature } from "./signing.js";
import { webhookPayloadHasNoPii, WEBHOOK_PII_FORBIDDEN_KEYS, PARTNER_EVENT_NOT_AUTHORIZATION } from "./payloadContract.js";
import type { PartnerWebhookPayload } from "./types.js";
import type { AbraxasPartnerKit, PartnerKitSafeResult } from "../client.js";
import { permitProtocolAction } from "../client.js";

export type PartnerWebhookVerifyError =
  | "invalid_signature"
  | "stale_timestamp"
  | "duplicate_event"
  | "wrong_partner"
  | "pii_present"
  | "invalid_payload"
  | "invalid_timestamp";

export type PartnerWebhookVerifyResult =
  | { ok: true; duplicate: false; payload: PartnerWebhookPayload; authorization: false }
  | { ok: true; duplicate: true; payload: PartnerWebhookPayload; authorization: false }
  | { ok: false; error: PartnerWebhookVerifyError; authorization: false };

export function verifyPartnerWebhookEvent(input: {
  secret: string;
  timestamp: string;
  rawBody: string;
  signatureHeader: string;
  expectedPartnerId: string;
  seenEventIds: Set<string>;
  nowSec?: number;
  maxSkewSec?: number;
}): PartnerWebhookVerifyResult {
  const closed = (error: PartnerWebhookVerifyError): PartnerWebhookVerifyResult => ({
    ok: false,
    error,
    authorization: false,
  });

  const signature = verifyWebhookSignature({
    secret: input.secret,
    timestamp: input.timestamp,
    rawBody: input.rawBody,
    signatureHeader: input.signatureHeader,
    nowSec: input.nowSec,
    maxSkewSec: input.maxSkewSec,
  });

  if (!signature.ok) {
    if (signature.error === "timestamp_skew") return closed("stale_timestamp");
    if (signature.error === "invalid_timestamp") return closed("invalid_timestamp");
    return closed("invalid_signature");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input.rawBody);
  } catch {
    return closed("invalid_payload");
  }

  if (!parsed || typeof parsed !== "object") return closed("invalid_payload");
  const payload = parsed as PartnerWebhookPayload;
  if (!payload.event_id || !payload.event_type || !payload.partner_id) {
    return closed("invalid_payload");
  }

  if (!webhookPayloadHasNoPii(payload)) return closed("pii_present");
  const text = JSON.stringify(payload).toLowerCase();
  for (const key of WEBHOOK_PII_FORBIDDEN_KEYS) {
    if (text.includes(key)) return closed("pii_present");
  }

  if (payload.partner_id !== input.expectedPartnerId) return closed("wrong_partner");

  if (input.seenEventIds.has(payload.event_id)) {
    return { ok: true, duplicate: true, payload, authorization: false };
  }

  input.seenEventIds.add(payload.event_id);
  return { ok: true, duplicate: false, payload, authorization: false };
}

export async function verifyWebhookThenReceipt(input: {
  kit: AbraxasPartnerKit;
  secret: string;
  timestamp: string;
  rawBody: string;
  signatureHeader: string;
  seenEventIds: Set<string>;
  nowSec?: number;
}): Promise<
  | { webhook: PartnerWebhookVerifyResult; receipt: PartnerKitSafeResult | null; grant: false }
  | { webhook: Extract<PartnerWebhookVerifyResult, { ok: true }>; receipt: PartnerKitSafeResult; grant: boolean }
> {
  const webhook = verifyPartnerWebhookEvent({
    secret: input.secret,
    timestamp: input.timestamp,
    rawBody: input.rawBody,
    signatureHeader: input.signatureHeader,
    expectedPartnerId: input.kit.options.partnerId,
    seenEventIds: input.seenEventIds,
    nowSec: input.nowSec,
  });

  if (!webhook.ok) {
    return { webhook, receipt: null, grant: false };
  }

  if (webhook.duplicate) {
    return { webhook, receipt: null, grant: false };
  }

  const receiptId = webhook.payload.receipt_id?.trim();
  if (!receiptId) {
    return { webhook, receipt: null, grant: false };
  }

  const fetched = await input.kit.fetchPublicReceipt(receiptId);
  if (!fetched.ok) {
    return { webhook, receipt: null, grant: false };
  }

  const receipt = input.kit.evaluateFetchedReceipt(fetched.receipt);
  return {
    webhook,
    receipt,
    grant: permitProtocolAction(receipt),
  };
}

export function webhookEventIsNotAuthorizationNotice(): string {
  return PARTNER_EVENT_NOT_AUTHORIZATION;
}
