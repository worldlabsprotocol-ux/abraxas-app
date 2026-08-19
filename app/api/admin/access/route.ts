// FILE: app/api/admin/access/route.ts
// Returns whether the current browser session or PIN may access admin tools.

import { NextRequest, NextResponse } from "next/server";
import { resolveAdminAccess } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const access = await resolveAdminAccess(req);
  return NextResponse.json({
    authorized: access.authorized,
    method: access.method,
    email: access.email ?? null,
    reason: access.reason,
    allowlist_configured: access.allowlist_configured,
    hint: access.authorized
      ? undefined
      : access.reason === "allowlist_empty"
        ? "Set ABRAXAS_ADMIN_EMAILS in Vercel or use POST /api/admin/session with PIN"
        : access.reason === "no_session"
          ? "Sign in with Google, then reload"
          : access.reason === "email_not_allowlisted"
            ? "Signed-in email is not in ABRAXAS_ADMIN_EMAILS"
            : undefined,
  });
}
