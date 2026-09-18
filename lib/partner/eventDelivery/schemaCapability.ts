// FILE: lib/partner/eventDelivery/schemaCapability.ts
// Fail-closed probe for outbox event_type CHECK. 067 types need no probe.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { isWebhookOutbox067EventType } from "@/lib/partner/eventDelivery/mapping";

const PROBE_PARTNER_ID = "__abraxas_event_type_probe__";
let extendedTypesCache: boolean | null = null;

export function resetWebhookExtendedEventTypeProbeCache(): void {
  extendedTypesCache = null;
}

export function classifyWebhookOutboxInsertError(error: { code?: string; message?: string } | null): string {
  if (!error) return "persistence_failed";
  if (error.code === "23514" || error.message?.toLowerCase().includes("event_type")) {
    return "event_type_not_supported";
  }
  if (error.code === "23503") return "partner_not_found";
  if (error.code === "23505") return "duplicate_event";
  return "persistence_failed";
}

/**
 * 067-compatible types are always supported.
 * Extended types require a CHECK that current Production/DEMO 067 schemas do not have.
 * Probe uses a dummy insert that must fail FK after CHECK; no durable row is kept.
 */
export async function webhookOutboxSupportsStoredEventType(storedType: string): Promise<boolean> {
  if (isWebhookOutbox067EventType(storedType)) return true;
  if (extendedTypesCache !== null) return extendedTypesCache;

  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb.from("partner_webhook_outbox").insert({
      partner_id: PROBE_PARTNER_ID,
      event_type: storedType,
      event_id: `probe-${storedType}`,
      idempotency_key: `webhook-probe:${storedType}`,
      payload: {
        event_id: `probe-${storedType}`,
        event_type: storedType,
        occurred_at: "1970-01-01T00:00:00.000Z",
        partner_id: PROBE_PARTNER_ID,
      },
      occurred_at: "1970-01-01T00:00:00.000Z",
      status: "pending",
    });

    if (!error) {
      await sb.from("partner_webhook_outbox").delete().eq("event_id", `probe-${storedType}`);
      extendedTypesCache = true;
      return true;
    }

    const classified = classifyWebhookOutboxInsertError(error);
    if (classified === "event_type_not_supported") {
      extendedTypesCache = false;
      return false;
    }
    if (classified === "partner_not_found" || classified === "duplicate_event") {
      extendedTypesCache = true;
      return true;
    }
    extendedTypesCache = false;
    return false;
  } catch {
    extendedTypesCache = false;
    return false;
  }
}
