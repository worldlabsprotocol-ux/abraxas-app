// FILE: lib/partner/integrationObservability/load.ts

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { listIntegrationEventsForTests, type IntegrationEventRow } from "./record";

const TABLE = "partner_integration_events";

export async function loadIntegrationEventsForApplication(input: {
  partnerId: string;
  applicationId: string;
  limit?: number;
}): Promise<IntegrationEventRow[]> {
  if (process.env.VITEST) {
    return listIntegrationEventsForTests()
      .filter((event) => event.partner_id === input.partnerId && event.application_id === input.applicationId)
      .slice(0, input.limit ?? 200);
  }
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("partner_id", input.partnerId)
      .eq("application_id", input.applicationId)
      .order("created_at", { ascending: false })
      .limit(input.limit ?? 200);
    if (error || !data) return listIntegrationEventsForTests();
    return data as IntegrationEventRow[];
  } catch {
    return listIntegrationEventsForTests();
  }
}
