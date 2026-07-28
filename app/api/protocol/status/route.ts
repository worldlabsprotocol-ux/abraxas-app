// FILE: app/api/protocol/status/route.ts
// Public protocol health — subsystem status + live metrics.

import { NextResponse } from "next/server";
import { getProtocolStatus } from "@/lib/protocol/protocolStatus";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET() {
  const status = await getProtocolStatus();
  return NextResponse.json(status, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
  });
}
