// FILE: lib/partner/webhooks/webhookConfigService.ts
// Admin webhook configuration — SSRF-safe endpoints, encrypted signing secrets.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { generateWebhookSigningSecret } from "@/lib/partner/webhooks/webhookSigning";
import {
  normalizeWebhookEndpointUrl,
  validateWebhookEndpointUrl,
} from "@/lib/partner/webhooks/webhookEndpointValidation";
import { encryptWebhookSigningSecret } from "@/lib/partner/webhooks/webhookSecretStorage";
import type { PartnerWebhookConfigRecord } from "@/lib/partner/webhooks/types";

const CONFIG = "partner_webhook_configs";

function mapConfig(row: Record<string, unknown>): PartnerWebhookConfigRecord {
  return {
    partner_id: row.partner_id as string,
    endpoint_url: row.endpoint_url as string,
    signing_secret_prefix: row.signing_secret_prefix as string,
    enabled: row.enabled as boolean,
    secret_revealed_at: (row.secret_revealed_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    enabled_at: (row.enabled_at as string | null) ?? null,
    last_rotated_at: (row.last_rotated_at as string | null) ?? null,
  };
}

export async function getPartnerWebhookConfig(partnerId: string): Promise<PartnerWebhookConfigRecord | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb.from(CONFIG).select("*").eq("partner_id", partnerId).maybeSingle();
  return data ? mapConfig(data) : null;
}

export async function listPartnerWebhookConfigs(): Promise<PartnerWebhookConfigRecord[]> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb.from(CONFIG).select("*").order("partner_id", { ascending: true });
  return (data ?? []).map(mapConfig);
}

export async function upsertPartnerWebhookEndpoint(input: {
  partnerId: string;
  endpointUrl: string;
}): Promise<
  | { ok: true; config: PartnerWebhookConfigRecord; signing_secret?: string; notice?: string }
  | { ok: false; error: string }
> {
  const validation = await validateWebhookEndpointUrl(input.endpointUrl);
  if (!validation.ok) return validation;

  const endpointUrl = normalizeWebhookEndpointUrl(validation.url);
  const sb = requireSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: existing } = await sb
    .from(CONFIG)
    .select("partner_id")
    .eq("partner_id", input.partnerId)
    .maybeSingle();

  if (existing) {
    const generated = generateWebhookSigningSecret();
    const encrypted = encryptWebhookSigningSecret(generated.raw);
    if (!encrypted) return { ok: false, error: "webhook_master_key_unconfigured" };

    const { data, error } = await sb
      .from(CONFIG)
      .update({
        endpoint_url: endpointUrl,
        signing_secret_ciphertext: encrypted.ciphertext,
        signing_secret_iv: encrypted.iv,
        signing_secret_prefix: generated.prefix,
        enabled: false,
        enabled_at: null,
        secret_revealed_at: now,
        last_rotated_at: now,
        updated_at: now,
      })
      .eq("partner_id", input.partnerId)
      .select("*")
      .single();

    if (error || !data) return { ok: false, error: error?.message ?? "update_failed" };
    return {
      ok: true,
      config: mapConfig(data),
      signing_secret: generated.raw,
      notice: "Endpoint changed — webhooks disabled and signing secret rotated. Copy the new secret now (shown once), update your verifier, then re-enable delivery.",
    };
  }

  const generated = generateWebhookSigningSecret();
  const encrypted = encryptWebhookSigningSecret(generated.raw);
  if (!encrypted) return { ok: false, error: "webhook_master_key_unconfigured" };

  const { data, error } = await sb
    .from(CONFIG)
    .insert({
      partner_id: input.partnerId,
      endpoint_url: endpointUrl,
      signing_secret_ciphertext: encrypted.ciphertext,
      signing_secret_iv: encrypted.iv,
      signing_secret_prefix: generated.prefix,
      enabled: false,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "create_failed" };

  return {
    ok: true,
    config: mapConfig(data),
    signing_secret: generated.raw,
    notice: "Copy the signing secret now — it will not be shown again.",
  };
}

export async function rotatePartnerWebhookSigningSecret(partnerId: string): Promise<
  | { ok: true; signing_secret: string; prefix: string; notice: string }
  | { ok: false; error: string }
> {
  const generated = generateWebhookSigningSecret();
  const encrypted = encryptWebhookSigningSecret(generated.raw);
  if (!encrypted) return { ok: false, error: "webhook_master_key_unconfigured" };

  const sb = requireSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from(CONFIG)
    .update({
      signing_secret_ciphertext: encrypted.ciphertext,
      signing_secret_iv: encrypted.iv,
      signing_secret_prefix: generated.prefix,
      secret_revealed_at: now,
      last_rotated_at: now,
      updated_at: now,
    })
    .eq("partner_id", partnerId)
    .select("partner_id")
    .maybeSingle();

  if (error || !data) return { ok: false, error: error?.message ?? "rotate_failed" };

  return {
    ok: true,
    signing_secret: generated.raw,
    prefix: generated.prefix,
    notice: "Copy the signing secret now — it will not be shown again.",
  };
}

export async function setPartnerWebhookEnabled(input: {
  partnerId: string;
  enabled: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = requireSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await sb
    .from(CONFIG)
    .update({
      enabled: input.enabled,
      enabled_at: input.enabled ? now : null,
      updated_at: now,
    })
    .eq("partner_id", input.partnerId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function loadPartnerWebhookSigningSecret(partnerId: string): Promise<string | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from(CONFIG)
    .select("signing_secret_ciphertext, signing_secret_iv, enabled")
    .eq("partner_id", partnerId)
    .maybeSingle();

  if (!data?.enabled) return null;

  const { decryptWebhookSigningSecret } = await import("@/lib/partner/webhooks/webhookSecretStorage");
  return decryptWebhookSigningSecret({
    ciphertext: data.signing_secret_ciphertext as string,
    iv: data.signing_secret_iv as string,
  });
}
