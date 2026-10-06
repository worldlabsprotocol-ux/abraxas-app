// FILE: lib/partner/pilotEvidence/load.ts
// Load integration events and launchpad activity for pilot evidence.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { LaunchpadActivityEventType } from "@/lib/partner/launchpad/types";
import {
  listIntegrationEventsForTests,
  type IntegrationEventRow,
} from "@/lib/partner/integrationObservability/record";
import { filterByEnvironment, filterByTimeWindow } from "./dedupe";

const INTEGRATION_TABLE = "partner_integration_events";
const ACTIVITY_TABLE = "partner_launchpad_activity";

export interface LaunchpadActivityRow {
  event_type: LaunchpadActivityEventType | string;
  public_code: string | null;
  metadata: Record<string, string | number | boolean | null>;
  created_at: string;
}

const activityMemory: Array<LaunchpadActivityRow & { partner_id?: string; application_id?: string }> = [];

export function resetLaunchpadActivityForTests(): void {
  activityMemory.length = 0;
}

export function recordLaunchpadActivityForTests(row: LaunchpadActivityRow & {
  partner_id?: string;
  application_id?: string;
}): void {
  activityMemory.unshift(row);
}

export async function loadIntegrationEvents(input: {
  partnerId: string;
  applicationId: string;
  environment?: "sandbox" | "production";
  from?: Date | null;
  to?: Date | null;
  limit?: number;
}): Promise<IntegrationEventRow[]> {
  let rows: IntegrationEventRow[];
  if (process.env.VITEST) {
    rows = listIntegrationEventsForTests()
      .filter((event) => event.partner_id === input.partnerId && event.application_id === input.applicationId);
  } else {
    try {
      const sb = requireSupabaseAdmin();
      const { data, error } = await sb
        .from(INTEGRATION_TABLE)
        .select("*")
        .eq("partner_id", input.partnerId)
        .eq("application_id", input.applicationId)
        .order("created_at", { ascending: true })
        .limit(input.limit ?? 2000);
      rows = error || !data ? [] : (data as IntegrationEventRow[]);
    } catch {
      rows = [];
    }
  }

  if (input.environment) {
    rows = filterByEnvironment(rows, input.environment);
  }
  rows = filterByTimeWindow(rows, input.from ?? null, input.to ?? null);
  return rows;
}

export async function loadLaunchpadActivity(input: {
  partnerId: string;
  applicationId: string;
  from?: Date | null;
  to?: Date | null;
  limit?: number;
}): Promise<LaunchpadActivityRow[]> {
  if (process.env.VITEST) {
    return activityMemory
      .filter((row) =>
        (!row.partner_id || row.partner_id === input.partnerId)
        && (!row.application_id || row.application_id === input.applicationId),
      )
      .filter((row) => {
        const at = new Date(row.created_at).getTime();
        if (input.from && at < input.from.getTime()) return false;
        if (input.to && at > input.to.getTime()) return false;
        return true;
      })
      .slice(0, input.limit ?? 500);
  }
  try {
    const sb = requireSupabaseAdmin();
    let query = sb
      .from(ACTIVITY_TABLE)
      .select("event_type, public_code, metadata, created_at")
      .eq("partner_id", input.partnerId)
      .eq("application_id", input.applicationId)
      .order("created_at", { ascending: true })
      .limit(input.limit ?? 500);
    if (input.from) query = query.gte("created_at", input.from.toISOString());
    if (input.to) query = query.lte("created_at", input.to.toISOString());
    const { data, error } = await query;
    if (error || !data) return [];
    return data as LaunchpadActivityRow[];
  } catch {
    return [];
  }
}
