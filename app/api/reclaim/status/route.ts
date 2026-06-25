// FILE: app/api/reclaim/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const context = req.nextUrl.searchParams.get("context");
  if (!context) return NextResponse.json({ verified: false });

  const { data } = await supabase
    .from("reclaim_verifications")
    .select("id")
    .eq("user_context", context)
    .limit(1);

  return NextResponse.json({ verified: !!data && data.length > 0 });
}
