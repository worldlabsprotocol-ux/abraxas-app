// FILE: app/api/admin/queue/route.ts
// GET the verification queue — all assets pending human review before marketplace listing.
// Protected by ADMIN_SECRET header. Called by admin dashboard UI.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.headers.get("x-admin-secret") !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error:"Unauthorized" }, { status: 401 });
  }

  // Assets awaiting review — joined with mint event + wallet
  const { data, error } = await supabase
    .from("assets")
    .select(`
      *,
      events!inner(type, created_at, payload)
    `)
    .eq("status", "pending_verification")
    .eq("events.type", "ASSET_TOKENIZED")
    .order("created_at", { ascending: true }); // FIFO — oldest first

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with hours_pending
  const enriched = (data ?? []).map(a => ({
    ...a,
    hours_pending: Math.round((Date.now() - new Date(a.created_at).getTime()) / 3600000),
    priority: new Date(a.created_at).getTime() < Date.now() - 3600000 * 24 ? "HIGH" : "NORMAL",
  }));

  return NextResponse.json({ queue: enriched, count: enriched.length });
}