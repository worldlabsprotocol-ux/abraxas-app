// FILE: lib/settlement/circle/availability.ts
// Preview-safe unavailable probe. Never calls Circle until testnet credentials exist.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CIRCLE_PUBLIC_CODES, type CirclePublicCode } from "@/lib/settlement/circle/codes";
import { CIRCLE_FEATURE, CIRCLE_SCHEMA_TABLE } from "@/lib/settlement/circle/constants";

export interface CircleCredentialProbe {
  api_key: boolean;
  entity_secret: boolean;
  wallet_set_id: boolean;
  source_wallet_id: boolean;
  destination_wallet_id: boolean;
  live_key_blocked: boolean;
  production_env_blocked: boolean;
}

export interface CircleAvailability {
  available: boolean;
  schema_ready: boolean;
  credentials_ready: boolean;
  code: CirclePublicCode | null;
  feature: typeof CIRCLE_FEATURE;
  activates_production: false;
  credentials: CircleCredentialProbe;
}

function isLiveCircleApiKey(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("LIVE_API_KEY:") || trimmed.includes("LIVE_API_KEY:");
}

function isProductionRuntime(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.ABRAXAS_RUNTIME_ENV === "production";
}

export function readCircleCredentialProbe(): CircleCredentialProbe {
  const apiKey = process.env.CIRCLE_API_KEY?.trim() ?? "";
  return {
    api_key: Boolean(apiKey) && !isLiveCircleApiKey(apiKey),
    entity_secret: Boolean(process.env.CIRCLE_ENTITY_SECRET?.trim()),
    wallet_set_id: Boolean(process.env.CIRCLE_WALLET_SET_ID?.trim()),
    source_wallet_id: Boolean(process.env.CIRCLE_DEMO_SOURCE_WALLET_ID?.trim()),
    destination_wallet_id: Boolean(process.env.CIRCLE_DEMO_DESTINATION_WALLET_ID?.trim()),
    live_key_blocked: Boolean(apiKey) && isLiveCircleApiKey(apiKey),
    production_env_blocked: isProductionRuntime(),
  };
}

export function credentialsReady(probe: CircleCredentialProbe): boolean {
  return (
    probe.api_key
    && probe.entity_secret
    && probe.wallet_set_id
    && probe.source_wallet_id
    && probe.destination_wallet_id
    && !probe.live_key_blocked
    && !probe.production_env_blocked
  );
}

function asErrorShape(error: unknown): { code: string; message: string } {
  if (!error || typeof error !== "object") {
    return { code: "", message: typeof error === "string" ? error : "" };
  }
  const rec = error as { code?: unknown; message?: unknown };
  return {
    code: typeof rec.code === "string" ? rec.code.trim() : "",
    message: typeof rec.message === "string" ? rec.message : "",
  };
}

export function isSettlementSchemaMissingError(error: unknown): boolean {
  const { code, message } = asErrorShape(error);
  const lower = message.toLowerCase();
  if (code === "42P01" || code === "PGRST202" || code === "PGRST205" || code === "PGRST204") {
    return true;
  }
  if (!lower) return false;
  return (
    lower.includes("does not exist")
    || lower.includes("schema cache")
    || lower.includes("could not find the table")
    || lower.includes("undefined table")
  );
}

export async function probeSettlementSchema(
  client?: SupabaseClient | null,
): Promise<boolean> {
  const sb = client ?? getSupabaseAdmin();
  if (!sb) return false;
  const { error } = await sb.from(CIRCLE_SCHEMA_TABLE).select("id", { head: true, count: "exact" }).limit(0);
  if (!error) return true;
  return false;
}

export function availabilityCode(input: {
  schemaReady: boolean;
  credentials: CircleCredentialProbe;
}): CirclePublicCode | null {
  if (input.credentials.production_env_blocked) return CIRCLE_PUBLIC_CODES.production_blocked;
  if (input.credentials.live_key_blocked) return CIRCLE_PUBLIC_CODES.live_credentials_blocked;
  if (!input.schemaReady) return CIRCLE_PUBLIC_CODES.schema_unavailable;
  if (!credentialsReady(input.credentials)) return CIRCLE_PUBLIC_CODES.unavailable;
  return null;
}

export async function probeCircleAvailability(
  client?: SupabaseClient | null,
): Promise<CircleAvailability> {
  const credentials = readCircleCredentialProbe();
  const schema_ready = await probeSettlementSchema(client);
  const creds = credentialsReady(credentials);
  const code = availabilityCode({ schemaReady: schema_ready, credentials });
  return {
    available: schema_ready && creds,
    schema_ready,
    credentials_ready: creds,
    code,
    feature: CIRCLE_FEATURE,
    activates_production: false,
    credentials: {
      api_key: credentials.api_key,
      entity_secret: credentials.entity_secret,
      wallet_set_id: credentials.wallet_set_id,
      source_wallet_id: credentials.source_wallet_id,
      destination_wallet_id: credentials.destination_wallet_id,
      live_key_blocked: credentials.live_key_blocked,
      production_env_blocked: credentials.production_env_blocked,
    },
  };
}
