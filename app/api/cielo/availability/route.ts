// FILE: app/api/cielo/availability/route.ts
// SEPARATE FEATURE — see lib/icalSync.ts for full explanation.
import { NextResponse } from "next/server";
import { getCieloBlockedDates } from "@/lib/icalSync";

export async function GET() {
  try {
    const blocked = await getCieloBlockedDates();
    return NextResponse.json({ blocked });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
