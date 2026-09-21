// FILE: app/api/reclaim/start/route.ts
// Retired generic provider-picker start. Reclaim sessions are created server-side.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({
    ok: false,
    code: "reclaim_start_retired",
    issued_receipt: false,
  }, { status: 410 });
}
