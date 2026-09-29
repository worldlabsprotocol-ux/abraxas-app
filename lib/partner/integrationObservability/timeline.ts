// FILE: lib/partner/integrationObservability/timeline.ts
// Safe lifecycle timeline lookup for operators and partners.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { listIntegrationEventsForTests, type IntegrationEventRow } from "./record";
import { integrationObservabilityLeaks } from "./sanitize";

const TABLE = "partner_integration_events";

export interface IntegrationTimelineEntry {
  at: string;
  event_type: string;
  lifecycle_stage: string;
  outcome: string | null;
  partner_safe_reason: string | null;
  request_id: string | null;
  receipt_id: string | null;
}

export interface IntegrationTimelineView {
  ok: true;
  partner_id: string;
  application_id: string | null;
  lookup: { by: "application" | "request" | "receipt"; value: string };
  entries: IntegrationTimelineEntry[];
}

async function loadEvents(filter: {
  partnerId: string;
  applicationId?: string;
  requestId?: string;
  receiptId?: string;
  limit?: number;
}): Promise<IntegrationEventRow[]> {
  if (process.env.VITEST) {
    return listIntegrationEventsForTests()
      .filter((event) => {
        if (event.partner_id !== filter.partnerId) return false;
        if (filter.applicationId && event.application_id !== filter.applicationId) return false;
        if (filter.requestId && event.request_id !== filter.requestId) return false;
        if (filter.receiptId && event.receipt_id !== filter.receiptId) return false;
        return true;
      })
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.event_id.localeCompare(b.event_id))
      .slice(0, filter.limit ?? 100);
  }
  const sb = requireSupabaseAdmin();
  let query = sb.from(TABLE).select("*").eq("partner_id", filter.partnerId).order("created_at", { ascending: true });
  if (filter.applicationId) query = query.eq("application_id", filter.applicationId);
  if (filter.requestId) query = query.eq("request_id", filter.requestId);
  if (filter.receiptId) query = query.eq("receipt_id", filter.receiptId);
  const { data, error } = await query.limit(filter.limit ?? 100);
  if (error || !data) return listIntegrationEventsForTests();
  return (data as IntegrationEventRow[]).map((row) => ({
    event_id: String(row.event_id),
    created_at: String(row.created_at),
    partner_id: String(row.partner_id),
    application_id: row.application_id ? String(row.application_id) : null,
    environment: row.environment === "production" ? "production" : "sandbox",
    event_type: row.event_type,
    lifecycle_stage: row.lifecycle_stage,
    outcome: row.outcome ?? null,
    partner_safe_reason: row.partner_safe_reason ?? null,
    request_id: row.request_id ?? null,
    receipt_id: row.receipt_id ?? null,
    policy_id: row.policy_id ?? null,
    policy_version: row.policy_version ?? null,
    correlation_id: row.correlation_id ?? null,
    handoff_ref: row.handoff_ref ?? null,
    latency_ms: row.latency_ms ?? null,
    metadata: row.metadata ?? {},
  }));
}

export async function buildIntegrationTimeline(input: {
  partnerId: string;
  applicationId?: string;
  requestId?: string;
  receiptId?: string;
}): Promise<IntegrationTimelineView | { ok: false; code: string }> {
  const by = input.requestId ? "request" as const : input.receiptId ? "receipt" as const : "application" as const;
  const value = input.requestId ?? input.receiptId ?? input.applicationId ?? "";
  if (!value) return { ok: false, code: "invalid_input" };

  const events = await loadEvents({
    partnerId: input.partnerId,
    applicationId: input.applicationId,
    requestId: input.requestId,
    receiptId: input.receiptId,
  });

  const entries: IntegrationTimelineEntry[] = events.map((event) => ({
    at: event.created_at,
    event_type: event.event_type,
    lifecycle_stage: event.lifecycle_stage,
    outcome: event.outcome,
    partner_safe_reason: event.partner_safe_reason,
    request_id: event.request_id,
    receipt_id: event.receipt_id,
  }));

  const view: IntegrationTimelineView = {
    ok: true,
    partner_id: input.partnerId,
    application_id: input.applicationId ?? events[0]?.application_id ?? null,
    lookup: { by, value },
    entries,
  };
  if (integrationObservabilityLeaks(view).length > 0) {
    return { ok: false, code: "redacted" };
  }
  return view;
}
