// FILE: app/api/cielo/availability/route.ts
import { NextResponse } from "next/server";
import { getCieloAvailability } from "@/lib/cielo/calendar";

export async function GET() {
  try {
    const data = await getCieloAvailability();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg, blocked: [], calendar: "abraxas_protocol" }, { status: 500 });
  }
}
