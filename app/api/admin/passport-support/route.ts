// FILE: app/api/admin/passport-support/route.ts
// Authorized operator view of session-bound Passport support requests.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { toAdminPassportSupportItem } from "@/lib/admin/passportSupportQueue";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Support inbox is unavailable." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("contact_submissions")
    .select("email,category,message,created_at")
    .like("category", "passport-support:%")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "Could not load the support inbox." }, { status: 500 });
  }

  const requests = (data ?? [])
    .map(toAdminPassportSupportItem)
    .filter(item => item !== null);

  return NextResponse.json({ requests });
}
