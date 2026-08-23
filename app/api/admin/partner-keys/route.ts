// FILE: app/api/admin/partner-keys/route.ts
// Create, list, and revoke partner API keys (admin PIN required).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkProductionSensitiveAdminAccess } from "@/lib/adminAuth";
import { generatePartnerKey, type PartnerScope } from "@/lib/partner/partnerAuth";
import {
  normalizePartnerKeyScopes,
  resolveIssuanceEnvironment,
} from "@/lib/partner/partnerKeyIssuance";
import { validatePartnerKeyIssuance } from "@/lib/partner/validatePartnerKeyIssuance";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function GET(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("partner_api_keys")
    .select("id, partner_id, display_name, key_prefix, scopes, revoked_at, created_at, last_used_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    partner_id?: string;
    display_name?: string;
    scopes?: PartnerScope[];
    environment?: "live" | "test";
  };

  const partnerId = body.partner_id?.trim();
  const displayName = body.display_name?.trim();
  if (!partnerId || !displayName) {
    return NextResponse.json({ error: "partner_id and display_name required" }, { status: 400 });
  }

  const scopesProvided = Object.prototype.hasOwnProperty.call(body, "scopes");
  const scopesResult = normalizePartnerKeyScopes(body.scopes, { scopesProvided });
  if (!scopesResult.ok) {
    return NextResponse.json({ error: scopesResult.error }, { status: 400 });
  }

  const environment = resolveIssuanceEnvironment(body.environment);
  const validation = await validatePartnerKeyIssuance(partnerId, environment);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status ?? 400 });
  }

  const { raw, prefix, hash } = generatePartnerKey(environment);

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("partner_api_keys")
    .insert({
      partner_id: partnerId,
      display_name: displayName,
      key_prefix: prefix,
      key_hash: hash,
      scopes: scopesResult.scopes,
    })
    .select("id, partner_id, display_name, key_prefix, scopes, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    key: data,
    api_key: raw,
    notice: "Copy the api_key now — it will not be shown again.",
  });
}

export async function PATCH(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { id?: string; revoke?: boolean };
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { error } = await sb
    .from("partner_api_keys")
    .update({ revoked_at: body.revoke !== false ? new Date().toISOString() : null })
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
