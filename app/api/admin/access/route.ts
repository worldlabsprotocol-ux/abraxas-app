// FILE: app/api/admin/access/route.ts
// Returns whether the current browser session or PIN may access admin tools.

import { NextRequest, NextResponse } from "next/server";
import { resolveAdminAccess } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const access = await resolveAdminAccess(req);
  return NextResponse.json({
    authorized: access.authorized,
    method: access.method,
    email: access.email ?? null,
  });
}
