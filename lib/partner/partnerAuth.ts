// FILE: lib/partner/partnerAuth.ts
// Partner API key auth — Bearer abx_… or X-Abraxas-Api-Key header.

import { createHash, randomBytes } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export type PartnerScope = "verify:credential" | "verify:registry" | "verify:requests";

export interface PartnerAuthContext {
  partnerId: string;
  apiKeyId: string;
  displayName: string;
  keyPrefix: string;
  scopes: PartnerScope[];
}

export interface PartnerAuthFailure {
  ok: false;
  error: string;
  status: 401 | 403;
}

export type PartnerAuthResult = { ok: true; ctx: PartnerAuthContext } | PartnerAuthFailure;

function sb(): SupabaseClient | null {
  if (!SB_URL || !SB_KEY) return null;
  return createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
}

export function hashPartnerKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generatePartnerKey(environment: "live" | "test" = "live"): { raw: string; prefix: string; hash: string } {
  const suffix = randomBytes(24).toString("base64url");
  const raw = environment === "live" ? `abx_live_${suffix}` : `abx_test_${suffix}`;
  const prefix = raw.slice(0, 16);
  return { raw, prefix, hash: hashPartnerKey(raw) };
}

export function extractPartnerKey(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token.startsWith("abx_")) return token;
  }
  const header = req.headers.get("x-abraxas-api-key");
  if (header?.startsWith("abx_")) return header.trim();
  return null;
}

export function requirePartnerApiKey(): boolean {
  return process.env.REQUIRE_PARTNER_API_KEY === "true";
}

export async function authenticatePartner(
  req: NextRequest,
  requiredScope?: PartnerScope,
): Promise<PartnerAuthResult | null> {
  const rawKey = extractPartnerKey(req);
  if (!rawKey) return null;

  const client = sb();
  if (!client) {
    return { ok: false, error: "Partner auth unavailable", status: 401 };
  }

  const hash = hashPartnerKey(rawKey);
  const { data, error } = await client
    .from("partner_api_keys")
    .select("id, partner_id, display_name, key_prefix, scopes, revoked_at")
    .eq("key_hash", hash)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Invalid API key", status: 401 };
  }

  if (data.revoked_at) {
    return { ok: false, error: "API key revoked", status: 403 };
  }

  const scopes = (data.scopes ?? []) as PartnerScope[];
  if (requiredScope && !scopes.includes(requiredScope)) {
    return { ok: false, error: `Missing scope: ${requiredScope}`, status: 403 };
  }

  void client
    .from("partner_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    ok: true,
    ctx: {
      partnerId: data.partner_id,
      apiKeyId: data.id,
      displayName: data.display_name,
      keyPrefix: data.key_prefix,
      scopes,
    },
  };
}

export async function resolvePartnerAuth(
  req: NextRequest,
  requiredScope?: PartnerScope,
): Promise<PartnerAuthResult | null> {
  const auth = await authenticatePartner(req, requiredScope);
  if (auth) return auth;
  if (requirePartnerApiKey()) {
    return { ok: false, error: "Partner API key required", status: 401 };
  }
  return null;
}
