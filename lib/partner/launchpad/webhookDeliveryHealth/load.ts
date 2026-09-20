// FILE: lib/partner/launchpad/webhookDeliveryHealth/load.ts
// Tenant-scoped load. Attribute deliveries only by exact payload.policy_id.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { getPartnerWebhookConfig } from "@/lib/partner/webhooks/webhookConfigService";
import { getWebhookTestDeliveryReadiness } from "@/lib/partner/webhooks/webhookOperatorReadiness";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import {
  WEBHOOK_DELIVERY_HEALTH_LIST_LIMIT,
  WEBHOOK_DELIVERY_HEALTH_WINDOW_HOURS,
} from "./contract";
import { extractOutboxPolicyId, partitionWebhookHealthDeliveries } from "./scope";
import { buildWebhookDeliveryHealthView } from "./view";

const OUTBOX = "partner_webhook_outbox";
const FETCH_LIMIT = 100;

export async function loadWebhookDeliveryHealth(input: {
  application: LaunchpadApplicationRow;
  partnerId: string;
}) {
  const [config, readiness] = await Promise.all([
    getPartnerWebhookConfig(input.partnerId),
    getWebhookTestDeliveryReadiness(input.partnerId),
  ]);

  const webhookConfigured = Boolean(config?.endpoint_url?.trim());
  const signingSecretConfigured = Boolean(config?.signing_secret_prefix);
  const deliveryEnabled = config?.enabled === true;
  const sinceIso = new Date(Date.now() - WEBHOOK_DELIVERY_HEALTH_WINDOW_HOURS * 3600_000).toISOString();

  const fetched = await listPartnerOutboxForHealth({
    partnerId: input.partnerId,
    sinceIso,
  });
  const partitioned = partitionWebhookHealthDeliveries({
    selectedPolicyId: input.application.policy_id,
    policyFieldReadable: fetched.policyFieldReadable,
    rows: fetched.rows,
  });

  return buildWebhookDeliveryHealthView({
    applicationId: input.application.id,
    partnerId: input.partnerId,
    webhookConfigured,
    signingSecretConfigured,
    deliveryEnabled,
    endpointUrl: config?.endpoint_url ?? null,
    retryReady: readiness.webhook_dispatch_configured && readiness.webhook_signing_capable,
    schemaReady: readiness.webhook_schema_062_ready && readiness.webhook_schema_063_ready,
    deliveries: partitioned.rows.slice(0, WEBHOOK_DELIVERY_HEALTH_LIST_LIMIT),
    deliveryScope: partitioned.delivery_scope,
  });
}

async function listPartnerOutboxForHealth(input: {
  partnerId: string;
  sinceIso: string;
}): Promise<{
  policyFieldReadable: boolean;
  rows: Array<{
    outbox_id: string;
    event_type: string;
    status: string;
    occurred_at: string;
    delivered_at: string | null;
    last_error_code: string | null;
    policy_id: string | null;
  }>;
}> {
  const sb = requireSupabaseAdmin();
  const withPayload = await sb
    .from(OUTBOX)
    .select("id, event_type, status, occurred_at, delivered_at, last_error_code, payload")
    .eq("partner_id", input.partnerId)
    .gte("occurred_at", input.sinceIso)
    .order("occurred_at", { ascending: false })
    .limit(FETCH_LIMIT);

  if (!withPayload.error) {
    return {
      policyFieldReadable: true,
      rows: ((withPayload.data as Array<Record<string, unknown>> | null) ?? []).map((row) => ({
        outbox_id: String(row.id ?? ""),
        event_type: String(row.event_type ?? ""),
        status: String(row.status ?? "pending"),
        occurred_at: String(row.occurred_at ?? ""),
        delivered_at: (row.delivered_at as string | null) ?? null,
        last_error_code: (row.last_error_code as string | null) ?? null,
        policy_id: extractOutboxPolicyId(row.payload),
      })),
    };
  }

  const fallback = await sb
    .from(OUTBOX)
    .select("id, event_type, status, occurred_at, delivered_at, last_error_code")
    .eq("partner_id", input.partnerId)
    .gte("occurred_at", input.sinceIso)
    .order("occurred_at", { ascending: false })
    .limit(FETCH_LIMIT);

  return {
    policyFieldReadable: false,
    rows: ((fallback.data as Array<Record<string, unknown>> | null) ?? []).map((row) => ({
      outbox_id: String(row.id ?? ""),
      event_type: String(row.event_type ?? ""),
      status: String(row.status ?? "pending"),
      occurred_at: String(row.occurred_at ?? ""),
      delivered_at: (row.delivered_at as string | null) ?? null,
      last_error_code: (row.last_error_code as string | null) ?? null,
      policy_id: null,
    })),
  };
}
