// FILE: app/api/verify/registry/route.ts
// Public credential verifier API — GET lookup, POST registry upsert (service role).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveVerifierQuery } from "@/lib/verifyRegistry";
import { resolvePartnerAuth } from "@/lib/partner/partnerAuth";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";

export const dynamic = "force-dynamic";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function GET(req: NextRequest) {
  const started = Date.now();
  const auth = await resolvePartnerAuth(req, "verify:registry");
  if (auth && !auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const q = req.nextUrl.searchParams.get("q") ?? req.nextUrl.searchParams.get("query") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ error: "q param required" }, { status: 400 });
  }

  const result = await resolveVerifierQuery(q);
  const partnerCtx = auth?.ok ? auth.ctx : null;

  if (partnerCtx) {
    void logPartnerUsage({
      endpoint: "/api/verify/registry",
      method: "GET",
      success: result.state === "RESOLVED_VALID",
      responseState: result.state,
      partner: partnerCtx,
      httpStatus: 200,
      responseTimeMs: Date.now() - started,
      recordType: result.resolved_type,
      recordId: result.query,
      decision: result.state === "RESOLVED_VALID" ? "approved" : "denied",
    });
  }

  return NextResponse.json(result);
}

interface RegistryUpsertPayload {
  did: string;
  assetClass: string;
  assuranceLevel: number;
  metadataUri: string;
  displayName?: string;
}

export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET ?? process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<RegistryUpsertPayload>;
  const { did, assetClass, assuranceLevel, metadataUri, displayName } = body;

  if (!did || !assetClass || !assuranceLevel || !metadataUri) {
    return NextResponse.json({ error: "Missing mandatory payload parameters." }, { status: 400 });
  }

  if (assuranceLevel < 1 || assuranceLevel > 4) {
    return NextResponse.json({ error: "Invalid assurance level. Must be 1–4." }, { status: 400 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("verified_registry")
    .upsert(
      {
        did_identifier: did,
        display_name: displayName ?? did,
        asset_class: assetClass,
        verification_status: "RESOLVED_VALID",
        current_pipeline_stage: "MARKETPLACE_LIVE",
        assurance_level: assuranceLevel,
        metadata_uri: metadataUri,
        last_monitored_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "did_identifier" },
    )
    .select()
    .single();

  if (error) {
    console.error("verified_registry upsert failed:", error.message);
    return NextResponse.json({ error: "Registry write failed." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "Registry state successfully updated.",
    data,
  });
}
