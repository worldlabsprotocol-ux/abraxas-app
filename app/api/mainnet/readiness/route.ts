// FILE: app/api/mainnet/readiness/route.ts
// Live mainnet gate status — merges static checklist with production telemetry.

import { NextResponse } from "next/server";
import { getLiveMainnetProgress } from "@/lib/mainnetReadinessLive";

export const dynamic = "force-dynamic";

export async function GET() {
  const progress = await getLiveMainnetProgress();
  return NextResponse.json(progress);
}
