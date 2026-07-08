// FILE: app/api/admin/cielo/verified-rate/route.ts
// Operator view of Cielo verified-rate pilot requests.

import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/adminAuth";
import { listVerifiedRateRequestsForAdmin } from "@/lib/cielo/verifiedRateService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requests = await listVerifiedRateRequestsForAdmin();
    return NextResponse.json({ requests });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load requests" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    public_reference?: string;
    status?: string;
  };

  if (!body.public_reference || !body.status) {
    return NextResponse.json({ error: "public_reference and status required" }, { status: 400 });
  }

  const allowed = ["request_received", "pending_review", "eligible", "not_eligible", "operator_confirmed", "declined"];
  if (!allowed.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { requireSupabaseAdmin } = await import("@/lib/supabase/admin");
  const sb = requireSupabaseAdmin();
  const { error } = await sb
    .from("cielo_verified_rate_requests")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("public_reference", body.public_reference);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
