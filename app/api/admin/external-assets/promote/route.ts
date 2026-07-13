// FILE: app/api/admin/external-assets/promote/route.ts
// Admin: approve application, mark deal ready, set settlement amount.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET ?? process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const applicationId = String(body.application_id ?? "").trim();
  const action = String(body.action ?? "approve").trim();
  const reviewer = String(body.named_reviewer ?? "Abraxas reviewer").trim();
  const publicSlug = body.public_verify_slug ? String(body.public_verify_slug).trim() : null;
  const amountUsdc = body.settlement_amount_usdc != null ? Number(body.settlement_amount_usdc) : null;

  if (!applicationId) {
    return NextResponse.json({ error: "application_id required" }, { status: 400 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  if (action === "deal_ready") {
    const { data, error } = await sb
      .from("external_asset_applications")
      .update({
        deal_status: "deal_ready",
        deal_ready_at: now,
        settlement_amount_usdc: amountUsdc ?? 100,
        updated_at: now,
      })
      .eq("id", applicationId)
      .select("id, deal_status, settlement_amount_usdc, public_verify_slug")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action, application: data });
  }

  const slug = publicSlug ?? `ABX-LAND-${applicationId.slice(0, 8).toUpperCase()}`;
  const { data, error } = await sb
    .from("external_asset_applications")
    .update({
      status: "verified",
      named_reviewer: reviewer,
      review_signed_at: now,
      public_verify_slug: slug,
      deal_status: amountUsdc ? "deal_ready" : "verified",
      deal_ready_at: amountUsdc ? now : null,
      settlement_amount_usdc: amountUsdc,
      updated_at: now,
    })
    .eq("id", applicationId)
    .select("id, status, public_verify_slug, deal_status, settlement_amount_usdc")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, action: "approve", application: data, verify_url: `/verify/${slug}` });
}
