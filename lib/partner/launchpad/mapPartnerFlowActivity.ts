// FILE: lib/partner/launchpad/mapPartnerFlowActivity.ts

import type { LaunchpadActivityEventType } from "@/lib/partner/launchpad/types";
import { maybeRecordLaunchpadFlowActivity } from "@/lib/partner/launchpad/recordPartnerFlowActivity";
import { recordIntegrationEventBestEffort } from "@/lib/partner/integrationObservability/record";

export type PartnerFlowLaunchpadContext = {
  appSlug?: string | null;
  applicationId?: string | null;
};

async function recordFlowIntegrationEvent(input: {
  context: PartnerFlowLaunchpadContext;
  partnerId: string;
  policyId: string;
  environment?: "sandbox" | "production";
  eventType: "holder_flow_started" | "holder_flow_completed" | "policy_evaluated" | "receipt_issued" | "verification_request_created";
  lifecycleStage: "holder" | "policy" | "receipt" | "request";
  outcome?: string;
  requestId?: string | null;
  receiptId?: string | null;
  correlationId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!input.context.applicationId) return;
  await recordIntegrationEventBestEffort({
    partnerId: input.partnerId,
    applicationId: input.context.applicationId,
    environment: input.environment ?? "sandbox",
    eventType: input.eventType,
    lifecycleStage: input.lifecycleStage,
    outcome: input.outcome ?? null,
    requestId: input.requestId ?? input.correlationId ?? null,
    receiptId: input.receiptId ?? null,
    policyId: input.policyId,
    correlationId: input.correlationId ?? null,
    metadata: input.metadata,
  });
}

export async function recordEvaluateLaunchpadActivity(input: {
  context: PartnerFlowLaunchpadContext;
  partnerId: string;
  policyId: string;
  correlationId?: string | null;
  next: string;
  replayStatus?: string | null;
  hasRedirectUrl?: boolean;
}): Promise<void> {
  const base = {
    appSlug: input.context.appSlug,
    applicationId: input.context.applicationId,
    partnerId: input.partnerId,
    policyId: input.policyId,
    correlationId: input.correlationId,
  };

  if (input.next === "passport") {
    await maybeRecordLaunchpadFlowActivity({
      ...base,
      eventType: "proof_created",
      publicCode: "passport_required",
    });
    await recordFlowIntegrationEvent({
      context: input.context,
      partnerId: input.partnerId,
      policyId: input.policyId,
      eventType: "holder_flow_started",
      lifecycleStage: "holder",
      outcome: "passport_required",
      correlationId: input.correlationId,
      metadata: { flow_next: input.next },
    });
    return;
  }

  if (input.next === "denied") {
    await maybeRecordLaunchpadFlowActivity({
      ...base,
      eventType: "verification_failed",
      publicCode: "denied",
    });
    await recordFlowIntegrationEvent({
      context: input.context,
      partnerId: input.partnerId,
      policyId: input.policyId,
      eventType: "policy_evaluated",
      lifecycleStage: "policy",
      outcome: "denied",
      correlationId: input.correlationId,
      metadata: { outcome_class: "policy_denied" },
    });
    return;
  }

  if (input.replayStatus === "idempotent_replay") {
    await maybeRecordLaunchpadFlowActivity({
      ...base,
      eventType: "proof_reused",
      publicCode: "reused",
    });
  }

  if (input.replayStatus === "issued") {
    await maybeRecordLaunchpadFlowActivity({
      ...base,
      eventType: "receipt_signing_attempted",
      publicCode: "signing",
    });
    await maybeRecordLaunchpadFlowActivity({
      ...base,
      eventType: "receipt_issued",
      publicCode: "issued",
    });
    await recordFlowIntegrationEvent({
      context: input.context,
      partnerId: input.partnerId,
      policyId: input.policyId,
      eventType: "receipt_issued",
      lifecycleStage: "receipt",
      outcome: "issued",
      correlationId: input.correlationId,
      metadata: { replay_status: input.replayStatus },
    });
  }

  if (input.next === "enter" && input.hasRedirectUrl) {
    await maybeRecordLaunchpadFlowActivity({
      ...base,
      eventType: "return_completed",
      publicCode: "redirect_ready",
    });
    await maybeRecordLaunchpadFlowActivity({
      ...base,
      eventType: "callback_completed",
      publicCode: "callback_ready",
    });
    await recordFlowIntegrationEvent({
      context: input.context,
      partnerId: input.partnerId,
      policyId: input.policyId,
      eventType: "holder_flow_completed",
      lifecycleStage: "holder",
      outcome: "enter",
      correlationId: input.correlationId,
      metadata: { flow_next: input.next },
    });
    await recordFlowIntegrationEvent({
      context: input.context,
      partnerId: input.partnerId,
      policyId: input.policyId,
      eventType: "policy_evaluated",
      lifecycleStage: "policy",
      outcome: "approved",
      correlationId: input.correlationId,
    });
  }
}

export async function recordCompleteLaunchpadActivity(input: {
  context: PartnerFlowLaunchpadContext;
  partnerId: string;
  policyId: string;
  correlationId?: string | null;
  replayStatus?: string | null;
  hasRedirectUrl?: boolean;
}): Promise<void> {
  const base = {
    appSlug: input.context.appSlug,
    applicationId: input.context.applicationId,
    partnerId: input.partnerId,
    policyId: input.policyId,
    correlationId: input.correlationId,
  };

  if (input.replayStatus === "issued") {
    await maybeRecordLaunchpadFlowActivity({
      ...base,
      eventType: "receipt_issued",
      publicCode: "issued",
    });
  }

  if (input.hasRedirectUrl) {
    await maybeRecordLaunchpadFlowActivity({
      ...base,
      eventType: "callback_completed",
      publicCode: "completed",
    });
  }
}

export async function recordFlowFailureActivity(input: {
  context: PartnerFlowLaunchpadContext;
  partnerId: string;
  policyId?: string;
  correlationId?: string | null;
  publicCode: string;
  eventType?: LaunchpadActivityEventType;
}): Promise<void> {
  await maybeRecordLaunchpadFlowActivity({
    appSlug: input.context.appSlug,
    applicationId: input.context.applicationId,
    partnerId: input.partnerId,
    policyId: input.policyId,
    correlationId: input.correlationId,
    eventType: input.eventType ?? "verification_failed",
    publicCode: input.publicCode,
  });
}
