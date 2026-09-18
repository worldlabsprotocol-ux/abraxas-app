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
  policyVersion?: number | null;
  decisionId?: string | null;
}): void {
  if (input.replayStatus !== "issued") return;
  if (input.decision !== "approved") return;

  const receiptId = input.receiptId?.trim();
  const partnerId = input.partnerId?.trim();
  if (!receiptId || !partnerId) return;

  enqueuePartnerWebhookEventBestEffort({
    partnerId,
    eventType: "receipt.issued",
    receiptId,
    policyId: input.policyId ?? null,
    policyVersion: input.policyVersion ?? null,
    decisionId: input.decisionId ?? null,
    resourceId: receiptId,
    outcome: "issued",
  });
}

export function maybeEnqueuePartnerReceiptRevoked(input: {
  partnerId: string;
  receiptId: string;
  decisionId?: string | null;
  policyId?: string | null;
  policyVersion?: number | null;
  reasonCode?: string | null;
  alreadyRevoked?: boolean;
}): void {
  if (input.alreadyRevoked) return;
  enqueuePartnerWebhookEventBestEffort({
    partnerId: input.partnerId,
    eventType: "receipt.revoked",
    receiptId: input.receiptId,
    decisionId: input.decisionId ?? null,
    policyId: input.policyId ?? null,
    policyVersion: input.policyVersion ?? null,
    reasonCode: input.reasonCode ?? null,
    resourceId: input.receiptId,
    outcome: "revoked",
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

export function maybeEnqueuePartnerDecisionDenied(input: {
  partnerId: string;
  decision?: string | null;
  receiptId?: string | null;
  policyId?: string | null;
  policyVersion?: number | null;
  decisionId?: string | null;
  reasonCode?: string | null;
}): void {
  if (input.decision !== "denied") return;
  const partnerId = input.partnerId?.trim();
  const resourceId = (input.decisionId ?? input.receiptId ?? "").trim();
  if (!partnerId || !resourceId) return;

  enqueuePartnerWebhookEventBestEffort({
    partnerId,
    eventType: "decision.denied",
    receiptId: input.receiptId ?? null,
    policyId: input.policyId ?? null,
    policyVersion: input.policyVersion ?? null,
    decisionId: input.decisionId ?? null,
    reasonCode: input.reasonCode ?? null,
    resourceId,
    outcome: "denied",
  });
}

export function maybeEnqueuePartnerReceiptExpired(input: {
  partnerId: string;
  status?: string | null;
  receiptId?: string | null;
  policyId?: string | null;
  policyVersion?: number | null;
  decisionId?: string | null;
}): void {
  if (input.status !== "expired") return;
  const receiptId = input.receiptId?.trim();
  const partnerId = input.partnerId?.trim();
  if (!receiptId || !partnerId) return;

  enqueuePartnerWebhookEventBestEffort({
    partnerId,
    eventType: "receipt.expired",
    receiptId,
    policyId: input.policyId ?? null,
    policyVersion: input.policyVersion ?? null,
    decisionId: input.decisionId ?? null,
    resourceId: receiptId,
    outcome: "expired",
  });
}

export function maybeEnqueueIntegrationHealthChanged(input: {
  partnerId: string;
  policyId?: string | null;
  policyVersion?: number | null;
  reasonCode?: string | null;
}): void {
  const partnerId = input.partnerId?.trim();
  if (!partnerId) return;

  enqueuePartnerWebhookEventBestEffort({
    partnerId,
    eventType: "integration.health_changed",
    policyId: input.policyId ?? null,
    policyVersion: input.policyVersion ?? null,
    reasonCode: input.reasonCode ?? "webhook_config_changed",
    resourceId: `${partnerId}:health:${input.reasonCode ?? "webhook_config_changed"}:${Date.now()}`,
    outcome: "health_changed",
  });
}

export function partnerWebhookEventTypes(): PartnerWebhookEventType[] {
  return [
    "partner.receipt.issued",
    "partner.receipt.revoked",
    "partner.access.revoked",
    "partner.credential.revoked",
    "receipt.issued",
    "receipt.expired",
    "receipt.revoked",
    "decision.denied",
    "integration.health_changed",
  ];
}
