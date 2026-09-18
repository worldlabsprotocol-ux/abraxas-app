// FILE: app/api/preview/supabase-binding/route.ts
// Preview-only runtime Supabase binding audit (project refs only; no secrets).

import { NextResponse } from "next/server";
import { auditRuntimeSupabaseBinding } from "@/lib/supabase/runtimeSupabaseBinding";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "preview_only", code: "preview_binding_probe_unavailable" }, { status: 404 });
  }

  const audit = auditRuntimeSupabaseBinding();
  return NextResponse.json(audit, {
    headers: { "Cache-Control": "no-store" },
  });
}
