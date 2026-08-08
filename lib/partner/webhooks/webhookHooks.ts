// FILE: lib/partner/webhooks/webhookHooks.ts
// Route/control-plane hooks — enqueue webhook events without blocking core flows.

import { enqueuePartnerWebhookEventBestEffort } from "@/lib/partner/webhooks/webhookOutbox";
import type { PartnerWebhookEventType } from "@/lib/partner/webhooks/types";

export function maybeEnqueuePartnerReceiptIssued(input: {
  partnerId: string;
  replayStatus?: "issued" | "idempotent_replay" | null;
  decision?: string | null;
  receiptId?: string | null;
  policyId?: string | null;
  decisionId?: string | null;
}): void {
  if (input.replayStatus !== "issued") return;
  if (input.decision !== "approved") return;

  const receiptId = input.receiptId?.trim();
  const partnerId = input.partnerId?.trim();
  if (!receiptId || !partnerId) return;

  enqueuePartnerWebhookEventBestEffort({
    partnerId,
    eventType: "partner.receipt.issued",
    receiptId,
    policyId: input.policyId ?? null,
    decisionId: input.decisionId ?? null,
    resourceId: receiptId,
  });
}

export function maybeEnqueuePartnerReceiptRevoked(input: {
  partnerId: string;
  receiptId: string;
  decisionId?: string | null;
  policyId?: string | null;
  reasonCode?: string | null;
  alreadyRevoked?: boolean;
}): void {
  if (input.alreadyRevoked) return;
  enqueuePartnerWebhookEventBestEffort({
    partnerId: input.partnerId,
    eventType: "partner.receipt.revoked",
    receiptId: input.receiptId,
    decisionId: input.decisionId ?? null,
    policyId: input.policyId ?? null,
    reasonCode: input.reasonCode ?? null,
    resourceId: input.receiptId,
  });
}

export function maybeEnqueuePartnerAccessRevoked(input: {
  partnerId: string;
  reasonCode?: string | null;
  resourceId: string;
}): void {
  enqueuePartnerWebhookEventBestEffort({
    partnerId: input.partnerId,
    eventType: "partner.access.revoked",
    reasonCode: input.reasonCode ?? null,
    resourceId: input.resourceId,
  });
}

export function maybeEnqueuePartnerCredentialRevoked(input: {
  partnerId: string;
  claimId: string;
  reasonCode?: string | null;
  receiptId?: string | null;
  policyId?: string | null;
  decisionId?: string | null;
}): void {
  enqueuePartnerWebhookEventBestEffort({
    partnerId: input.partnerId,
    eventType: "partner.credential.revoked",
    reasonCode: input.reasonCode ?? null,
    receiptId: input.receiptId ?? null,
    policyId: input.policyId ?? null,
    decisionId: input.decisionId ?? null,
    resourceId: `${input.claimId}:${input.partnerId}`,
  });
}

export function partnerWebhookEventTypes(): PartnerWebhookEventType[] {
  return [
    "partner.receipt.issued",
    "partner.receipt.revoked",
    "partner.access.revoked",
    "partner.credential.revoked",
  ];
}
