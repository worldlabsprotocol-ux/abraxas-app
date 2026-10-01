// FILE: app/api/admin/operator-attention/route.ts
// Read-only operator attention snapshot — per-source error truth.

import { NextRequest, NextResponse } from "next/server";
import { checkProductionSensitiveAdminAccess } from "@/lib/adminAuth";
import { loadOperatorAttentionSnapshot } from "@/lib/admin/operatorAttention";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await loadOperatorAttentionSnapshot();
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
