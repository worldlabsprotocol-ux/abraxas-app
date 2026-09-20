// FILE: lib/partner/launchpad/recordPartnerFlowActivity.ts
// Best effort launchpad activity from real partner flow routes.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import type { LaunchpadActivityEventType } from "@/lib/partner/launchpad/types";
import {
  getLaunchpadApplicationBySlug,
  getLaunchpadApplicationForPartner,
} from "@/lib/partner/launchpad/resolveLaunchpadApplication";

export type LaunchpadFlowActivityInput = {
  applicationId?: string | null;
  appSlug?: string | null;
  partnerId: string;
  policyId?: string | null;
  eventType: LaunchpadActivityEventType;
  publicCode?: string;
  correlationId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

async function resolveApplicationId(input: LaunchpadFlowActivityInput): Promise<{
  applicationId: string;
  partnerId: string;
} | null> {
  if (input.applicationId) {
    const app = await getLaunchpadApplicationForPartner(input.applicationId, input.partnerId);
    if (!app) return null;
    return { applicationId: app.id, partnerId: app.partner_id };
  }

  const slug = input.appSlug?.trim();
  if (slug) {
    const app = await getLaunchpadApplicationBySlug(slug);
    if (!app || app.partner_id !== input.partnerId) return null;
    return { applicationId: app.id, partnerId: app.partner_id };
  }

  return null;
}

/**
 * Activity logging is best effort and must never block verification success.
 * Failures are logged server side only.
 */
export async function maybeRecordLaunchpadFlowActivity(
  input: LaunchpadFlowActivityInput,
): Promise<void> {
  try {
    const resolved = await resolveApplicationId(input);
    if (!resolved) return;

    const metadata: Record<string, string | number | boolean | null> = {
      ...(input.metadata ?? {}),
    };
    if (input.correlationId) {
      metadata.correlation_id = input.correlationId;
    }
    if (input.policyId) {
      metadata.policy_id = input.policyId;
    }

    const sb = requireSupabaseAdmin();
    await recordLaunchpadActivity(sb, {
      applicationId: resolved.applicationId,
      partnerId: resolved.partnerId,
      eventType: input.eventType,
      publicCode: input.publicCode,
      metadata,
    });
  } catch (error) {
    console.error("[launchpad/activity] best effort record failed", {
      event_type: input.eventType,
      error: "unavailable",
    });
  }
}
