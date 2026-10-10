// FILE: app/api/identity/veriff/status/route.ts
// Frontend polls this to find out if a verification has completed,
// since the actual decision arrives async via webhook, not the redirect.
import { NextRequest, NextResponse } from "next/server";
import { supabaseForRoute } from "@/lib/supabase/routeAdmin";

export async function GET(req: NextRequest) {
  const supabase = supabaseForRoute();
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  const { data } = await supabase
    .from("identity_verifications")
    .select("status")
    .eq("user_email", email)
    .single();

  return NextResponse.json({ status: data?.status ?? "not_started" });
}
