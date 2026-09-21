// FILE: app/api/reclaim/status/route.ts
// Retired user-context status. Use GET /api/reclaim/session.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: false,
    code: "reclaim_status_retired",
    verified: false,
    issued_receipt: false,
  }, { status: 410 });
}
