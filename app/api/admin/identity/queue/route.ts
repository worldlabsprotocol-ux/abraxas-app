// FILE: app/api/admin/identity/queue/route.ts
// Manual identity review queue (Veriff subscription inactive workaround).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAdmin } from "@/lib/adminAuth";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  let query = sb
    .from("passport_documents")
    .select("id, created_at, user_email, sui_address, file_name, storage_path, status, reviewer_note, reviewed_at, reviewed_by")
    .eq("stamp_id", "identity")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status === "pending") {
    query = query.in("status", ["submitted", "under_review"]);
  } else if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [], count: data?.length ?? 0 });
}
