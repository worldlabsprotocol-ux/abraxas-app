// FILE: lib/admin/requireAdminRouteAccess.ts
// Shared admin route gate with distinct 401 vs 403 responses.

import { NextRequest, NextResponse } from "next/server";
import { resolveAdminAccess, type AdminAccessReason } from "@/lib/adminAuth";

function statusForDeniedReason(reason: AdminAccessReason): number {
  return reason === "email_not_allowlisted" ? 403 : 401;
}

export async function requireAdminRouteAccess(req: NextRequest): Promise<NextResponse | null> {
  const access = await resolveAdminAccess(req);
  if (access.authorized) return null;
  const status = statusForDeniedReason(access.reason);
  return NextResponse.json(
    { error: status === 403 ? "Forbidden" : "Unauthorized" },
    { status },
  );
}
