// FILE: app/api/admin/identity/pending-count/route.ts
// Returns pending identity-review count for authorized admins only (no queue payload).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/adminAuth";
import { countPendingIdentityReviewSessions } from "@/lib/admin/identityReviewPendingCount";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function GET(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("passport_documents")
    .select("id, capture_session_id, status")
    .eq("stamp_id", "identity")
    .in("status", ["submitted", "under_review"])
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pending_count = countPendingIdentityReviewSessions(data ?? []);
  return NextResponse.json({ pending_count });
}
