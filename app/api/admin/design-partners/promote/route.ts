// FILE: app/api/admin/design-partners/promote/route.ts
// Promote approved application → partner org + sandbox (or live) API key.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkProductionSensitiveAdminAccess } from "@/lib/adminAuth";
import { promoteDesignPartnerApplication } from "@/lib/partner/promoteDesignPartner";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    application_id?: string;
    partner_id?: string;
    issue_live?: boolean;
  };

  if (!body.application_id) {
    return NextResponse.json({ error: "application_id required" }, { status: 400 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("design_partners")
    .select("*")
    .eq("id", body.application_id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  try {
    const result = await promoteDesignPartnerApplication(data, {
      partner_id: body.partner_id,
      issue_live: body.issue_live,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      notice: "Copy api_key now — it will not be shown again. Share via secure channel only.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
