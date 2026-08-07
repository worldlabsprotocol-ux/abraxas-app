// FILE: lib/partner/partnerFlowHealth.ts
// Aggregate Partner Flow operational health for admin views (last 24h, no sensitive payloads).

import { createClient } from "@supabase/supabase-js";
import {
  getPartnerFlowRateLimitBackendInfo,
  PARTNER_FLOW_RATE_LIMIT_ENDPOINTS,
  type PartnerFlowRateLimitBackendInfo,
} from "@/lib/partner/partnerFlowRateLimit";
import {
  getPartnerFlowTelemetrySnapshot,
  summarizePartnerFlowTelemetry,
  type PartnerFlowTelemetryEvent,
  type PartnerFlowTelemetrySnapshot,
} from "@/lib/partner/partnerFlowTelemetry";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const PARTNER_FLOW_USAGE_ENDPOINTS = [
  "/api/v1/partner-flow/evaluate",
  "/api/v1/partner-flow/complete",
  "/api/v1/partner-flow/refresh",
  "/api/receipts/",
  "/api/v1/verification-requests/",
] as const;

type UsageRow = {
  endpoint: string;
  method: string | null;
  http_status: number | null;
  response_time_ms: number | null;
  partner_id: string | null;
  policy_id: string | null;
  response_state: string | null;
  created_at: string;
};

function mapUsageRowToTelemetry(row: UsageRow): PartnerFlowTelemetryEvent | null {
  const endpoint = row.endpoint?.trim();
  if (!endpoint) return null;

  const isPartnerFlowSurface = PARTNER_FLOW_USAGE_ENDPOINTS.some(prefix => endpoint.startsWith(prefix))
    || (PARTNER_FLOW_RATE_LIMIT_ENDPOINTS as readonly string[]).includes(endpoint);

  if (!isPartnerFlowSurface) return null;

  const httpStatus = row.http_status ?? (row.response_state === "rate_limited" ? 429 : 200);
  const rateLimited = httpStatus === 429 || row.response_state === "rate_limited";

  let outcome: PartnerFlowTelemetryEvent["outcome"] = "success";
  if (rateLimited) outcome = "rate_limited";
  else if (httpStatus === 404) outcome = "not_found";
  else if (httpStatus === 401 || httpStatus === 403) outcome = "unauthorized";
  else if (httpStatus >= 500) outcome = "server_error";
  else if (httpStatus >= 400) outcome = "client_error";

  return {
    ts: row.created_at,
    endpoint,
    method: (row.method ?? "GET").toUpperCase(),
    outcome,
    http_status: httpStatus,
    latency_ms: row.response_time_ms ?? 0,
    rate_limited: rateLimited,
    partner_id: row.partner_id,
    policy_id: row.policy_id,
    audit_persistence_failed: row.response_state === "audit_persistence_failed",
  };
}

async function fetchUsageRows24h(): Promise<UsageRow[]> {
  if (!SB_URL || !SB_KEY) return [];

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  const { data, error } = await sb
    .from("partner_api_usage")
    .select("endpoint, method, http_status, response_time_ms, partner_id, policy_id, response_state, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    console.warn("partner-flow health: partner_api_usage query failed:", error.message);
    return [];
  }

  return (data ?? []) as UsageRow[];
}

export interface PartnerFlowHealthReport {
  window_hours: number;
  generated_at: string;
  sources: {
    in_memory_telemetry: boolean;
    partner_api_usage: boolean;
  };
  rate_limit: PartnerFlowRateLimitBackendInfo;
  telemetry: PartnerFlowTelemetrySnapshot;
}

export async function buildPartnerFlowHealthReport(windowHours = 24): Promise<PartnerFlowHealthReport> {
  const inMemorySnapshot = getPartnerFlowTelemetrySnapshot(windowHours);
  const usageRows = await fetchUsageRows24h();
  const usageEvents = usageRows
    .map(mapUsageRowToTelemetry)
    .filter((event): event is PartnerFlowTelemetryEvent => event !== null);

  const usageSnapshot = usageEvents.length > 0
    ? summarizePartnerFlowTelemetry(usageEvents, windowHours)
    : null;

  const telemetry: PartnerFlowTelemetrySnapshot = usageSnapshot
    ? {
        ...usageSnapshot,
        audit_persistence_failures:
          usageSnapshot.audit_persistence_failures + inMemorySnapshot.audit_persistence_failures,
      }
    : inMemorySnapshot;

  return {
    window_hours: windowHours,
    generated_at: new Date().toISOString(),
    sources: {
      in_memory_telemetry: inMemorySnapshot.total_requests > 0,
      partner_api_usage: usageEvents.length > 0,
    },
    rate_limit: await getPartnerFlowRateLimitBackendInfo(),
    telemetry,
  };
}
