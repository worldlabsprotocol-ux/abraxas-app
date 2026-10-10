// FILE: app/api/waitlist/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseForRoute } from "@/lib/supabase/routeAdmin";

export async function POST(req: NextRequest) {
  const supabase = supabaseForRoute();
  try {
    const { email } = await req.json() as { email?: string };
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    await supabase.from("waitlist").upsert(
      { email, source: "zk_login" },
      { onConflict: "email" }
    );
    return NextResponse.json({ joined: true });
  } catch {
    // fail open, never block someone from feeling like they joined
    return NextResponse.json({ joined: true });
  }
}
