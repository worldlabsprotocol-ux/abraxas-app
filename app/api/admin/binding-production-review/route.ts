// FILE: app/api/admin/binding-production-review/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { loadBindingProductionQueue } from "@/lib/partner/launchpad/bindingProduction/queue";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;
  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  if (status !== "pending" && status !== "approved" && status !== "rejected") {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const result = await loadBindingProductionQueue(status);
  if (!result.ok) {
    return NextResponse.json({ error: result.code }, { status: 503 });
  }
  return NextResponse.json({ ok: true, items: result.items }, { headers: { "Cache-Control": "no-store" } });
}
