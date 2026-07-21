// FILE: lib/relyingPartyProduction.ts
// External relying-party production proof — mainnet gate #5 telemetry.

import { createClient } from "@supabase/supabase-js";
import { isExternalProductionPartner } from "@/lib/partner/internalPartners";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export interface ExternalRpProductionEvent {
  partnerId: string;
  endpoint: string;
  decision: string;
  recordId: string | null;
  policyId: string | null;
  createdAt: string;
  apiKeyPrefix: string | null;
}

export interface ExternalRpGateStatus {
  met: boolean;
  approvedProductionChecks: number;
  latest: ExternalRpProductionEvent | null;
  events: ExternalRpProductionEvent[];
  criteria: string;
}

export const EXTERNAL_RP_PRODUCTION_CRITERIA =
  "An unaffiliated organization with an abx_live_ API key clears a real production verify call (decision: approved) — not Abraxas sandbox or first-party flows.";

export async function getExternalRpGateStatus(limit = 10): Promise<ExternalRpGateStatus> {
  if (!SB_URL || !SB_KEY) {
    return {
      met: false,
      approvedProductionChecks: 0,
      latest: null,
      events: [],
      criteria: EXTERNAL_RP_PRODUCTION_CRITERIA,
    };
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  const { data: usageRows, error } = await sb
    .from("partner_api_usage")
    .select("partner_id, endpoint, decision, record_id, policy_id, created_at, api_key_id")
    .eq("decision", "approved")
    .in("endpoint", ["/api/credentials/verify", "/api/v1/verification-requests"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.warn("getExternalRpGateStatus:", error.message);
    return {
      met: false,
      approvedProductionChecks: 0,
      latest: null,
      events: [],
      criteria: EXTERNAL_RP_PRODUCTION_CRITERIA,
    };
  }

  const keyIds = Array.from(
    new Set((usageRows ?? []).map(r => r.api_key_id).filter(Boolean)),
  ) as string[];
  const keyPrefixById = new Map<string, string>();

  if (keyIds.length) {
    const { data: keys } = await sb
      .from("partner_api_keys")
      .select("id, key_prefix")
      .in("id", keyIds);
    for (const k of keys ?? []) {
      keyPrefixById.set(k.id as string, k.key_prefix as string);
    }
  }

  const events: ExternalRpProductionEvent[] = [];

  for (const row of usageRows ?? []) {
    const partnerId = row.partner_id as string | null;
    if (!isExternalProductionPartner(partnerId)) continue;

    const prefix = row.api_key_id ? keyPrefixById.get(row.api_key_id as string) ?? null : null;
    if (prefix && !prefix.startsWith("abx_live_")) continue;

    events.push({
      partnerId: partnerId!,
      endpoint: row.endpoint as string,
      decision: row.decision as string,
      recordId: (row.record_id as string | null) ?? null,
      policyId: (row.policy_id as string | null) ?? null,
      createdAt: row.created_at as string,
      apiKeyPrefix: prefix,
    });
  }

  const limited = events.slice(0, limit);

  return {
    met: events.length > 0,
    approvedProductionChecks: events.length,
    latest: limited[0] ?? null,
    events: limited,
    criteria: EXTERNAL_RP_PRODUCTION_CRITERIA,
  };
}
