// FILE: app/api/admin/privacy/requests/route.ts
// Admin queue for privacy requests.

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/adminAuth";
import { listPrivacyRequestsForAdmin } from "@/lib/privacy/privacyControlPlane";
import { isPrivacyRequestStatus } from "@/lib/privacy/types";

export async function GET(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statusParam = req.nextUrl.searchParams.get("status");
  const statusFilter = statusParam && isPrivacyRequestStatus(statusParam)
    ? statusParam
    : undefined;

  try {
    const requests = await listPrivacyRequestsForAdmin(statusFilter);
    return NextResponse.json({ requests });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Queue unavailable";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
