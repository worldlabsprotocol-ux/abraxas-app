// FILE: app/api/trust/status/route.ts
// Phase 4: one endpoint for identity + credential + on-chain + intent status.

import { NextRequest, NextResponse } from "next/server";
import { getTrustStatus } from "@/lib/trust/getTrustStatus";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sui = req.nextUrl.searchParams.get("sui") ?? req.nextUrl.searchParams.get("sui_address");
  if (!sui) {
    return NextResponse.json({ error: "sui param required" }, { status: 400 });
  }

  const status = await getTrustStatus(sui);
  if (!status) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  return NextResponse.json(status);
}
