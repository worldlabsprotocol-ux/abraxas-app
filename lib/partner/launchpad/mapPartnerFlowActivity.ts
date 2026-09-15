// FILE: lib/partner/launchpad/mapPartnerFlowActivity.ts

import type { LaunchpadActivityEventType } from "@/lib/partner/launchpad/types";
import { maybeRecordLaunchpadFlowActivity } from "@/lib/partner/launchpad/recordPartnerFlowActivity";

export type PartnerFlowLaunchpadContext = {
  appSlug?: string | null;
  applicationId?: string | null;
};

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
    return;
  }

  if (input.next === "denied") {
    await maybeRecordLaunchpadFlowActivity({
      ...base,
      eventType: "verification_failed",
      publicCode: "denied",
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
