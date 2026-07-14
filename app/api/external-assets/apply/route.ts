// FILE: app/api/external-assets/apply/route.ts
// External asset owner launch — instant registry listing (L1), optional Abraxas review upgrade.

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateOwnerRegistrySlug } from "@/lib/portal/registrySlug";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const VALID_ASSET_CLASSES = new Set([
  "REAL_ESTATE_LAND",
  "REAL_ESTATE",
  "MINERAL_RIGHTS",
  "TRIBAL_LAND",
  "BUSINESS_ENTITY",
  "OTHER",
]);

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
    linked_wallet?: string;
    description?: string;
    launch_mode?: string;
  };

  const assetName = body.asset_name?.trim();
  const assetClass = body.asset_class?.trim();
  const contactEmail = body.contact_email?.trim();
  const linkedWallet = body.linked_wallet?.trim() || body.contact_wallet?.trim() || null;

  if (!assetName || !assetClass) {
    return NextResponse.json({ error: "asset_name and asset_class required" }, { status: 400 });
  }

  if (!VALID_ASSET_CLASSES.has(assetClass)) {
    return NextResponse.json({ error: "Invalid asset_class" }, { status: 400 });
  }

  if (!contactEmail && !linkedWallet) {
    return NextResponse.json({
      error: "contact_email or linked_wallet required — sign in with Passport or provide email",
    }, { status: 400 });
  }

  const originator = body.originator?.trim() === "abraxas" ? "abraxas" : "external";
  const now = new Date().toISOString();
  const applicationId = randomUUID();
  const publicSlug = generateOwnerRegistrySlug(assetClass, applicationId);

  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({
      ok: true,
      application_id: `local-${Date.now()}`,
      status: "pending_review",
      public_verify_slug: publicSlug,
      verify_url: `/verify/${publicSlug}`,
      message: "Listing prepared (local mode — run migration 038 for persistence).",
    });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.from("external_asset_applications").insert({
    id: applicationId,
    originator,
    asset_name: assetName,
    asset_class: assetClass,
    jurisdiction: body.jurisdiction?.trim() ?? null,
    estimated_value: body.estimated_value?.trim() ?? null,
    evidence_scope: body.evidence_scope?.trim() ?? null,
    evidence_expires_at: body.evidence_expires_at ?? null,
    contact_name: body.contact_name?.trim() ?? null,
    contact_email: contactEmail ?? null,
    contact_wallet: linkedWallet,
    linked_wallet: linkedWallet,
    wallet_linked_at: linkedWallet ? now : null,
    description: body.description?.trim() ?? null,
    status: "pending_review",
    public_verify_slug: publicSlug,
    registry_published_at: now,
    deal_status: linkedWallet ? "review" : "intake",
    is_demo_sample: false,
    updated_at: now,
  }).select("id, status, public_verify_slug, registry_published_at").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    application_id: data.id,
    status: data.status,
    public_verify_slug: data.public_verify_slug,
    verify_url: `/verify/${data.public_verify_slug}`,
    listed: true,
    message: "Your listing is live on the Abraxas registry (L1 owner-listed). Abraxas review can upgrade assurance when you are ready.",
  });
}

export async function GET() {
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ applications: [], demo_samples: [], published_count: 0 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data } = await sb
    .from("external_asset_applications")
    .select("id, asset_name, asset_class, jurisdiction, status, public_verify_slug, is_demo_sample, originator, evidence_scope, named_reviewer, registry_published_at, created_at")
    .order("registry_published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(40);

  const rows = data ?? [];
  const published = rows.filter(r => r.public_verify_slug && !r.is_demo_sample);
  return NextResponse.json({
    applications: rows.filter(r => !r.is_demo_sample),
    demo_samples: rows.filter(r => r.is_demo_sample),
    published_count: published.length,
  });
}
