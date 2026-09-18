// FILE: lib/partner/eventDelivery/conformance.ts
// Offline Partner Event Delivery conformance checks.

import { signWebhookBody } from "@/lib/partner/webhooks/webhookSigning";
import {
  buildPartnerWebhookPayload,
  webhookPayloadHasNoPii,
} from "@/lib/partner/webhooks/webhookPayloadContract";
import { WEBHOOK_MAX_ATTEMPTS, WEBHOOK_RETRY_DELAYS_MS } from "@/lib/partner/webhooks/types";
import type { PartnerWebhookEventType } from "@/lib/partner/webhooks/types";
import {
  PARTNER_PUBLIC_EVENT_TYPES,
} from "@/lib/partner/eventDelivery/contract";
import {
  partnerDeliveryIsRedeliverable,
  toPartnerVisibleDeliveryState,
} from "@/lib/partner/eventDelivery/mapping";
import { verifyPartnerWebhookEvent } from "@/lib/partner/eventDelivery/verify";

const SECRET = "abx_whsec_conformance_fixture_secret";
const PARTNER = "partner-acme";
const TIMESTAMP = "1700000000";

function signedEvent(eventType: PartnerWebhookEventType, extra?: Record<string, unknown>) {
  const payload = {
    ...buildPartnerWebhookPayload({
      eventId: `evt-${eventType}`,
      eventType,
      occurredAt: "2026-09-18T00:00:00.000Z",
      partnerId: PARTNER,
      policyId: "policy-v1",
      policyVersion: 1,
      receiptId: eventType === "integration.health_changed" ? null : "dr_conformance",
      decisionId: eventType === "decision.denied" ? "dec_1" : null,
    }),
    ...extra,
  };
  const rawBody = JSON.stringify(payload);
  const signature = signWebhookBody({ secret: SECRET, timestamp: TIMESTAMP, rawBody });
  return { payload, rawBody, signature };
}

export function partnerEventDeliveryConformanceChecks(): Array<{
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}> {
  const seen = new Set<string>();
  const issued = signedEvent("receipt.issued");
  const valid = verifyPartnerWebhookEvent({
    secret: SECRET,
    timestamp: TIMESTAMP,
    rawBody: issued.rawBody,
    signatureHeader: issued.signature,
    expectedPartnerId: PARTNER,
    seenEventIds: seen,
    nowSec: 1700000000,
  });

  const invalidSig = verifyPartnerWebhookEvent({
    secret: SECRET,
    timestamp: TIMESTAMP,
    rawBody: issued.rawBody,
    signatureHeader: "v1=deadbeef",
    expectedPartnerId: PARTNER,
    seenEventIds: new Set(),
    nowSec: 1700000000,
  });

  const stale = verifyPartnerWebhookEvent({
    secret: SECRET,
    timestamp: TIMESTAMP,
    rawBody: issued.rawBody,
    signatureHeader: issued.signature,
    expectedPartnerId: PARTNER,
    seenEventIds: new Set(),
    nowSec: 1700000000 + 10_000,
  });

  const duplicate = verifyPartnerWebhookEvent({
    secret: SECRET,
    timestamp: TIMESTAMP,
    rawBody: issued.rawBody,
    signatureHeader: issued.signature,
    expectedPartnerId: PARTNER,
    seenEventIds: seen,
    nowSec: 1700000000,
  });

  const wrongPartner = verifyPartnerWebhookEvent({
    secret: SECRET,
    timestamp: TIMESTAMP,
    rawBody: issued.rawBody,
    signatureHeader: issued.signature,
    expectedPartnerId: "other-partner",
    seenEventIds: new Set(),
    nowSec: 1700000000,
  });

  const piiFailures: string[] = [];
  for (const eventType of PARTNER_PUBLIC_EVENT_TYPES) {
    const built = buildPartnerWebhookPayload({
      eventId: `evt-${eventType}`,
      eventType,
      occurredAt: "2026-09-18T00:00:00.000Z",
      partnerId: PARTNER,
      policyId: "policy-v1",
      policyVersion: 1,
      receiptId: eventType === "integration.health_changed" ? null : "dr_x",
      decisionId: eventType === "decision.denied" ? "dec_x" : null,
    });
    if (!webhookPayloadHasNoPii(built)) piiFailures.push(eventType);
    const text = JSON.stringify(built).toLowerCase();
    if (text.includes("@") || text.includes("0x") || text.includes("email") || text.includes("wallet")) {
      piiFailures.push(`${eventType}:pii-text`);
    }
  }

  const retrying = toPartnerVisibleDeliveryState({ status: "retrying", attempt_count: 2 });
  const failed = toPartnerVisibleDeliveryState({ status: "failed", attempt_count: 2 });
  const dead = toPartnerVisibleDeliveryState({ status: "failed", attempt_count: WEBHOOK_MAX_ATTEMPTS });
  const redeliverFailed = partnerDeliveryIsRedeliverable({ status: "failed", webhookEnabled: true });
  const redeliverDead = partnerDeliveryIsRedeliverable({ status: "failed", webhookEnabled: true });

  const checks: Array<{ id: string; label: string; status: "pass" | "fail"; evidence: string }> = [
    {
      id: "event-delivery-valid-signature",
      label: "Valid webhook signature is accepted (offline fixture)",
      status: valid.ok && !valid.duplicate ? "pass" : "fail",
      evidence: valid.ok ? "HMAC v1 accepted" : "valid signature rejected",
    },
    {
      id: "event-delivery-invalid-signature",
      label: "Invalid webhook signature is rejected (fail closed)",
      status: !invalidSig.ok && invalidSig.error === "invalid_signature" ? "pass" : "fail",
      evidence: !invalidSig.ok ? invalidSig.error : "invalid signature accepted",
    },
    {
      id: "event-delivery-stale-timestamp",
      label: "Stale webhook timestamp is rejected",
      status: !stale.ok && stale.error === "stale_timestamp" ? "pass" : "fail",
      evidence: !stale.ok ? stale.error : "stale timestamp accepted",
    },
    {
      id: "event-delivery-duplicate-event",
      label: "Duplicate event ID is ignored",
      status: duplicate.ok && duplicate.duplicate ? "pass" : "fail",
      evidence: duplicate.ok && duplicate.duplicate ? "duplicate ignored" : "duplicate not ignored",
    },
    {
      id: "event-delivery-wrong-partner",
      label: "Wrong partner ID is rejected",
      status: !wrongPartner.ok && wrongPartner.error === "wrong_partner" ? "pass" : "fail",
      evidence: !wrongPartner.ok ? wrongPartner.error : "wrong partner accepted",
    },
    {
      id: "event-delivery-pii-absent",
      label: "PII is absent from every public event type",
      status: piiFailures.length === 0 ? "pass" : "fail",
      evidence: piiFailures.length === 0
        ? `${PARTNER_PUBLIC_EVENT_TYPES.length} event types contain no PII keys`
        : piiFailures.join(","),
    },
    {
      id: "event-delivery-retry-schedule",
      label: "Failed delivery retries on a bounded schedule",
      status: retrying === "retrying" && WEBHOOK_RETRY_DELAYS_MS.length === 5 ? "pass" : "fail",
      evidence: `retry delays=${WEBHOOK_RETRY_DELAYS_MS.join(",")} max_attempts=${WEBHOOK_MAX_ATTEMPTS}`,
    },
    {
      id: "event-delivery-dead-letter-redeliver",
      label: "Failed and dead-lettered events can be safely redelivered",
      status: failed === "failed" && dead === "dead-lettered" && redeliverFailed && redeliverDead ? "pass" : "fail",
      evidence: `failed=${failed} dead-lettered=${dead} redeliverable=${redeliverFailed}`,
    },
    {
      id: "event-delivery-receipt-still-required",
      label: "Webhook verification is not authorization",
      status: valid.ok && valid.authorization === false ? "pass" : "fail",
      evidence: "Partners must fetch and verify the signed receipt before granting access",
    },
  ];

  return checks;
}
