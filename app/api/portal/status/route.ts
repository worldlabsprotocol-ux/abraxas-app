// FILE: app/api/portal/status/route.ts
// Owner lookup: application_id + contact email (mirrors Cielo guest status pattern).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildApplicationLifecycle,
  sanitizeApplicationForOwner,
} from "@/lib/portal/applicationStatus";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const applicationId = String(body.application_id ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!applicationId || !email) {
    return NextResponse.json({ error: "application_id and email required" }, { status: 400 });
  }

  if (applicationId.startsWith("local-")) {
    return NextResponse.json({
      error: "Local application — open this page in the same browser where you submitted, or connect Supabase for persistent tracking.",
    }, { status: 404 });
  }

  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data: row } = await sb
    .from("external_asset_applications")
    .select(
      "id, status, asset_name, asset_class, jurisdiction, evidence_scope, contact_email, named_reviewer, review_signed_at, public_verify_slug, created_at, updated_at, is_demo_sample",
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (String(row.contact_email ?? "").trim().toLowerCase() !== email) {
    return NextResponse.json({ error: "Email does not match this application" }, { status: 403 });
  }

  const lifecycle = buildApplicationLifecycle(applicationId, row);

  return NextResponse.json({
    ok: true,
    application: sanitizeApplicationForOwner(row),
    lifecycle,
    is_demo_sample: Boolean(row.is_demo_sample),
  });
}

/** Lightweight public check — no PII, for status page prefetch. */
export async function GET(req: NextRequest) {
  const applicationId = req.nextUrl.searchParams.get("application_id")?.trim();
  if (!applicationId) {
    return NextResponse.json({ error: "application_id required" }, { status: 400 });
  }

  if (applicationId.startsWith("local-")) {
    return NextResponse.json({
      ok: true,
      exists: true,
      application_id: applicationId,
      requires_email: true,
      local_mode: true,
    });
  }

  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data: row } = await sb
    .from("external_asset_applications")
    .select("id, status, asset_name, asset_class, created_at")
    .eq("id", applicationId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    exists: true,
    application_id: row.id,
    asset_name: row.asset_name,
    asset_class: row.asset_class,
    status: row.status,
    requires_email: true,
  });
}
