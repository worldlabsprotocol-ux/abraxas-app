// FILE: lib/passport/reusableCredential/resolveInstitutionalIntegrationApplication.ts
// Authoritative Launchpad application attribution for institutional observability.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { listIntegrationEventsForTests } from "@/lib/partner/integrationObservability/record";

const REQUEST_ATTRIBUTION_EVENT_TYPES = [
  "verification_request_created",
  "hosted_handoff_created",
] as const;

function resolveFromIntegrationEventsMemory(input: {
  partnerId: string;
  requestId: string;
}): string | null {
  for (const event of listIntegrationEventsForTests()) {
    if (event.partner_id !== input.partnerId) continue;
    if (event.request_id !== input.requestId) continue;
    if (!REQUEST_ATTRIBUTION_EVENT_TYPES.includes(event.event_type as (typeof REQUEST_ATTRIBUTION_EVENT_TYPES)[number])) {
      continue;
    }
    if (event.application_id) return event.application_id;
  }
  return null;
}

export async function resolveInstitutionalIntegrationApplicationId(input: {
  partnerId: string;
  policyId: string;
  environment: "sandbox" | "production";
  requestId: string;
}): Promise<string | null> {
  const requestId = input.requestId.trim();
  if (!requestId) return null;

  if (process.env.VITEST) {
    const fromMemory = resolveFromIntegrationEventsMemory({
      partnerId: input.partnerId,
      requestId,
    });
    if (fromMemory) return fromMemory;
  }

  try {
    const sb = requireSupabaseAdmin();
    const { data: requestEvent } = await sb
      .from("partner_integration_events")
      .select("application_id")
      .eq("partner_id", input.partnerId)
      .eq("request_id", requestId)
      .in("event_type", [...REQUEST_ATTRIBUTION_EVENT_TYPES])
      .not("application_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (requestEvent?.application_id) {
      return String(requestEvent.application_id);
    }

    const { data: apps } = await sb
      .from("partner_launchpad_applications")
      .select("id")
      .eq("partner_id", input.partnerId)
      .eq("policy_id", input.policyId)
      .eq("environment", input.environment)
      .eq("status", "active");
    if (apps?.length === 1 && apps[0]?.id) {
      return String(apps[0].id);
    }
  } catch {
    return null;
  }
  return null;
}
