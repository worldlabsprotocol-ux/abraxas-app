// FILE: app/api/admin/launchpad/production-requests/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from("partner_production_access_requests")
    .select(`
      id,
      application_id,
      partner_id,
      status,
      request_notes,
      reviewer_notes,
      created_at,
      reviewed_at,
      partner_launchpad_applications (
        application_name,
        display_name,
        public_slug,
        allowed_return_urls,
        policy_template_id
      )
    `)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[admin/launchpad] list production requests failed", { message: error.message });
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, requests: data ?? [] });
}
