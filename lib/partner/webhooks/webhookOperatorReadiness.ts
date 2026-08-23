// FILE: lib/partner/webhooks/webhookOperatorReadiness.ts
// Server-side operational readiness booleans for sandbox webhook test delivery.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  isWebhookCronSecretConfigured,
  isWebhookDispatchSchedulerConfigured,
} from "@/lib/partner/webhooks/webhookDispatchHealth";
import { loadPartnerWebhookSigningSecret } from "@/lib/partner/webhooks/webhookConfigService";

const WEBHOOK_TEST_RPC = "enqueue_partner_webhook_test_delivery";

export interface WebhookTestDeliveryReadiness {
  webhook_schema_062_ready: boolean;
  webhook_schema_063_ready: boolean;
  webhook_test_events_supported: boolean;
  webhook_delivery_enabled: boolean;
  webhook_dispatch_configured: boolean;
  webhook_signing_capable: boolean;
  test_delivery_available: boolean;
}

function sb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function tableExists(tableName: string): Promise<boolean> {
  const client = sb();
  if (!client) return false;

  const { error } = await client.from(tableName).select("*", { head: true, count: "exact" }).limit(0);
  if (!error) return true;
  if (error.code === "42P01" || error.message?.includes("does not exist")) return false;
  return false;
}

export async function probeWebhookSchema062Ready(): Promise<boolean> {
  const tables = [
    "partner_webhook_configs",
    "partner_webhook_outbox",
    "partner_webhook_delivery_attempts",
  ] as const;

  for (const table of tables) {
    if (!(await tableExists(table))) return false;
  }
  return true;
}

export async function probeWebhookSchema063Ready(): Promise<boolean> {
  const tables = [
    "partner_webhook_dispatch_runs",
    "partner_webhook_retry_audit",
  ] as const;

  for (const table of tables) {
    if (!(await tableExists(table))) return false;
  }
  return true;
}

export async function probeWebhookTestEventsSupported(): Promise<boolean> {
  const client = sb();
  if (!client) return false;

  const { error } = await client.rpc(WEBHOOK_TEST_RPC, { p_partner_id: "" });
  if (!error) return true;
  if (error.code === "PGRST202" || error.message?.toLowerCase().includes("does not exist")) {
    return false;
  }
  return true;
}

export async function probeWebhookDeliveryEnabled(partnerId: string): Promise<boolean> {
  const client = sb();
  if (!client) return false;

  const { data, error } = await client
    .from("partner_webhook_configs")
    .select("enabled")
    .eq("partner_id", partnerId)
    .maybeSingle();

  if (error) return false;
  return data?.enabled === true;
}

export function probeWebhookDispatchConfigured(): boolean {
  return isWebhookDispatchSchedulerConfigured() && isWebhookCronSecretConfigured();
}

export async function probeWebhookSigningCapable(partnerId: string): Promise<boolean> {
  if (!process.env.ABRAXAS_WEBHOOK_MASTER_KEY?.trim()) return false;
  const secret = await loadPartnerWebhookSigningSecret(partnerId);
  return secret !== null;
}

export function isSandboxPartnerApiKey(keyPrefix: string): boolean {
  return keyPrefix.startsWith("abx_test_");
}

export function partnerHasWebhooksReadScope(scopes: readonly string[]): boolean {
  return scopes.includes("webhooks:read");
}

export async function getWebhookTestDeliveryReadiness(
  partnerId: string,
): Promise<WebhookTestDeliveryReadiness> {
  const [
    webhook_schema_062_ready,
    webhook_schema_063_ready,
    webhook_test_events_supported,
    webhook_delivery_enabled,
    webhook_signing_capable,
  ] = await Promise.all([
    probeWebhookSchema062Ready(),
    probeWebhookSchema063Ready(),
    probeWebhookTestEventsSupported(),
    probeWebhookDeliveryEnabled(partnerId),
    probeWebhookSigningCapable(partnerId),
  ]);

  const webhook_dispatch_configured = probeWebhookDispatchConfigured();

  const test_delivery_available =
    webhook_schema_062_ready
    && webhook_schema_063_ready
    && webhook_test_events_supported
    && webhook_delivery_enabled
    && webhook_dispatch_configured
    && webhook_signing_capable;

  return {
    webhook_schema_062_ready,
    webhook_schema_063_ready,
    webhook_test_events_supported,
    webhook_delivery_enabled,
    webhook_dispatch_configured,
    webhook_signing_capable,
    test_delivery_available,
  };
}
