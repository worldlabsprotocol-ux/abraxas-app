// FILE: app/api/external-assets/apply/route.ts
// External asset owner application — pending review until named reviewer signs.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    originator?: string;
    asset_name?: string;
    asset_class?: string;
    jurisdiction?: string;
    estimated_value?: string;
    evidence_scope?: string;
    evidence_expires_at?: string;
    contact_name?: string;
    contact_email?: string;
    contact_wallet?: string;
    description?: string;
  };

  const assetName = body.asset_name?.trim();
  const assetClass = body.asset_class?.trim();
  const contactEmail = body.contact_email?.trim();

  if (!assetName || !assetClass || !contactEmail) {
    return NextResponse.json({
      error: "asset_name, asset_class, and contact_email required",
    }, { status: 400 });
  }

  const originator = body.originator?.trim() === "abraxas" ? "abraxas" : "external";

  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({
      ok: true,
      application_id: `local-${Date.now()}`,
      status: "pending_review",
      message: "Application received (local mode — run migration 029 for persistence).",
    });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.from("external_asset_applications").insert({
    originator,
    asset_name: assetName,
    asset_class: assetClass,
    jurisdiction: body.jurisdiction?.trim() ?? null,
    estimated_value: body.estimated_value?.trim() ?? null,
    evidence_scope: body.evidence_scope?.trim() ?? null,
    evidence_expires_at: body.evidence_expires_at ?? null,
    contact_name: body.contact_name?.trim() ?? null,
    contact_email: contactEmail,
    contact_wallet: body.contact_wallet?.trim() ?? null,
    description: body.description?.trim() ?? null,
    status: "pending_review",
    is_demo_sample: false,
    updated_at: new Date().toISOString(),
  }).select("id, status, public_verify_slug").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    application_id: data.id,
    status: data.status,
    public_verify_slug: data.public_verify_slug,
    message: "Application received. Status is Pending review until a named reviewer signs the claim.",
  });
}

export async function GET() {
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ applications: [], demo_samples: [] });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data } = await sb
    .from("external_asset_applications")
    .select("id, asset_name, asset_class, jurisdiction, status, public_verify_slug, is_demo_sample, originator, evidence_scope, named_reviewer, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const rows = data ?? [];
  return NextResponse.json({
    applications: rows.filter(r => !r.is_demo_sample),
    demo_samples: rows.filter(r => r.is_demo_sample),
  });
}
