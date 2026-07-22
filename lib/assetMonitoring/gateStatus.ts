// FILE: lib/assetMonitoring/gateStatus.ts
// Mainnet gate #6 telemetry — asset monitoring v1 production readiness.

import { createClient } from "@supabase/supabase-js";
import { parseEnvBool } from "@/lib/env/parseEnvBool";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const ASSET_MONITORING_GATE_CRITERIA =
  "Automated listing/pipeline drift feeds, credential TTL monitoring, and partner webhooks — with auto-apply enabled and lot inventory configured in production.";

export interface AssetMonitoringGateStatus {
  met: boolean;
  autoApply: boolean;
  lotInventoryRows: number;
  recentStatusEvents: number;
  criteria: string;
}

export async function getAssetMonitoringGateStatus(): Promise<AssetMonitoringGateStatus> {
  const autoApply = parseEnvBool(process.env.ASSET_MONITORING_AUTO_APPLY);
  let lotInventoryRows = 0;
  let recentStatusEvents = 0;

  if (SB_URL && SB_KEY) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

    const { count: lotCount } = await sb
      .from("asset_lot_inventory")
      .select("id", { count: "exact", head: true });

    lotInventoryRows = lotCount ?? 0;

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: eventCount } = await sb
      .from("asset_lot_status_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);

    recentStatusEvents = eventCount ?? 0;
  }

  const met = autoApply && lotInventoryRows > 0;

  return {
    met,
    autoApply,
    lotInventoryRows,
    recentStatusEvents,
    criteria: ASSET_MONITORING_GATE_CRITERIA,
  };
}
