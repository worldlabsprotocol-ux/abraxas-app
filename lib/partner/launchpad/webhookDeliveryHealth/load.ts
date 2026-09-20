// FILE: lib/partner/launchpad/webhookDeliveryHealth/load.ts
// Tenant-scoped load. Session partner_id + application_id. No payload returned.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { getPartnerWebhookConfig } from "@/lib/partner/webhooks/webhookConfigService";
import { getWebhookTestDeliveryReadiness } from "@/lib/partner/webhooks/webhookOperatorReadiness";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import {
  WEBHOOK_DELIVERY_HEALTH_LIST_LIMIT,
  WEBHOOK_DELIVERY_HEALTH_WINDOW_HOURS,
} from "./contract";
import { buildWebhookDeliveryHealthView, type WebhookHealthOutboxRow } from "./view";

const OUTBOX = "partner_webhook_outbox";

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

  const { rows, scopedByApplicationPolicy } = await listScopedDeliveries({
    partnerId: input.partnerId,
    policyId: input.application.policy_id,
    sinceIso,
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
    deliveries: rows,
    scopedByApplicationPolicy,
  });
}

async function listScopedDeliveries(input: {
  partnerId: string;
  policyId: string;
  sinceIso: string;
}): Promise<{ rows: WebhookHealthOutboxRow[]; scopedByApplicationPolicy: boolean }> {
  const sb = requireSupabaseAdmin();
  const base = () => sb
    .from(OUTBOX)
    .select("id, event_type, status, occurred_at, delivered_at, last_error_code")
    .eq("partner_id", input.partnerId)
    .gte("occurred_at", input.sinceIso)
    .order("occurred_at", { ascending: false })
    .limit(WEBHOOK_DELIVERY_HEALTH_LIST_LIMIT);

  const scoped = await base().eq("payload->>policy_id", input.policyId);
  if (!scoped.error) {
    return { rows: mapRows(scoped.data), scopedByApplicationPolicy: true };
  }

  const fallback = await base();
  return { rows: mapRows(fallback.data), scopedByApplicationPolicy: false };
}

function mapRows(data: unknown): WebhookHealthOutboxRow[] {
  return ((data as Array<Record<string, unknown>> | null) ?? []).map((row) => ({
    outbox_id: String(row.id ?? ""),
    event_type: String(row.event_type ?? ""),
    status: String(row.status ?? "pending"),
    occurred_at: String(row.occurred_at ?? ""),
    delivered_at: (row.delivered_at as string | null) ?? null,
    last_error_code: (row.last_error_code as string | null) ?? null,
  }));
}
