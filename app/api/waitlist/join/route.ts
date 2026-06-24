// FILE: app/api/waitlist/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
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
