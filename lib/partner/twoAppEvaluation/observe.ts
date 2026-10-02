// FILE: lib/partner/twoAppEvaluation/observe.ts
// Load integration events for both evaluation applications.

import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";
import type { LaunchpadActivityRow } from "@/lib/partner/pilotEvidence/load";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { loadIntegrationEvents, loadLaunchpadActivity } from "@/lib/partner/pilotEvidence/load";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { TwoAppEvaluationRecord } from "./contract";

export interface TwoAppObservationContext {
  record: TwoAppEvaluationRecord;
  app_a: LaunchpadApplicationRow | null;
  app_b: LaunchpadApplicationRow | null;
  events_a: IntegrationEventRow[];
  events_b: IntegrationEventRow[];
  activity_a: LaunchpadActivityRow[];
  activity_b: LaunchpadActivityRow[];
  partner_events: IntegrationEventRow[];
}

const appMemory = new Map<string, LaunchpadApplicationRow>();

export function seedLaunchpadApplicationForTests(app: LaunchpadApplicationRow): void {
  appMemory.set(app.id, app);
}

export function resetLaunchpadApplicationMemoryForTests(): void {
  appMemory.clear();
}

async function loadApplication(applicationId: string): Promise<LaunchpadApplicationRow | null> {
  const cached = appMemory.get(applicationId);
  if (cached) return cached;
  if (process.env.VITEST) return null;
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb
      .from("partner_launchpad_applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();
    return (data as LaunchpadApplicationRow | null) ?? null;
  } catch {
    return null;
  }
}

export async function loadTwoAppObservationContext(
  record: TwoAppEvaluationRecord,
): Promise<TwoAppObservationContext> {
  const [app_a, app_b, events_a, events_b, activity_a, activity_b] = await Promise.all([
    loadApplication(record.app_a.application_id),
    loadApplication(record.app_b.application_id),
    loadIntegrationEvents({
      partnerId: record.partner_id,
      applicationId: record.app_a.application_id,
      environment: "sandbox",
    }),
    loadIntegrationEvents({
      partnerId: record.partner_id,
      applicationId: record.app_b.application_id,
      environment: "sandbox",
    }),
    loadLaunchpadActivity({
      partnerId: record.partner_id,
      applicationId: record.app_a.application_id,
    }),
    loadLaunchpadActivity({
      partnerId: record.partner_id,
      applicationId: record.app_b.application_id,
    }),
  ]);

  const partnerEvents = [...events_a, ...events_b].sort(
    (a, b) => a.created_at.localeCompare(b.created_at),
  );

  return {
    record,
    app_a,
    app_b,
    events_a,
    events_b,
    activity_a,
    activity_b,
    partner_events: partnerEvents,
  };
}
