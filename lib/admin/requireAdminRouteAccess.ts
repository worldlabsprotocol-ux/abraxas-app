// FILE: lib/admin/requireAdminRouteAccess.ts
// Shared admin route gate with distinct 401 vs 403 responses.
// Production origin: session email allowlist only (no PIN / admin session cookie).

import { NextRequest, NextResponse } from "next/server";
import {
  resolveAdminAccess,
  resolveStrictProductionAdminAccess,
  shouldEnforceStrictProductionAdminAccess,
  type AdminAccessReason,
} from "@/lib/adminAuth";

function statusForDeniedReason(reason: AdminAccessReason): number {
  return reason === "email_not_allowlisted" ? 403 : 401;
}

export async function requireAdminRouteAccess(req: NextRequest): Promise<NextResponse | null> {
  if (shouldEnforceStrictProductionAdminAccess()) {
    const access = await resolveStrictProductionAdminAccess(req);
    if (access.authorized) return null;
    const status = statusForDeniedReason(access.reason);
    return NextResponse.json(
      { error: status === 403 ? "Forbidden" : "Unauthorized" },
      { status },
    );
  }

  const access = await resolveAdminAccess(req);
  if (access.authorized) return null;
  const status = statusForDeniedReason(access.reason);
  return NextResponse.json(
    { error: status === 403 ? "Forbidden" : "Unauthorized" },
    { status },
  );
}
