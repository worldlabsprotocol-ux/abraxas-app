// FILE: app/api/positioning/loop/route.ts
// Live asset positioning loop status — investor-grade backend truth.

import { NextResponse } from "next/server";
import { getPositioningLoopStatus } from "@/lib/positioningLoop";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getPositioningLoopStatus();
  return NextResponse.json(status);
}
