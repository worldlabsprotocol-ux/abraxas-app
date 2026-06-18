// FILE: app/api/identity/veriff/status/route.ts
// Frontend polls this to find out if a verification has completed,
// since the actual decision arrives async via webhook, not the redirect.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
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
