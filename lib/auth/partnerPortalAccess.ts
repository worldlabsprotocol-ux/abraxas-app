// FILE: lib/auth/partnerPortalAccess.ts
// Server-side gate for partner-only surfaces — not public navigation.

import type { NextRequest } from "next/server";
import { resolvePartnerAuth } from "@/lib/partner/partnerAuth";

const ADMIN_PIN = process.env.ADMIN_PIN ?? "";

export function hasAdminPin(req: NextRequest): boolean {
  if (!ADMIN_PIN) return false;
  const pin = req.headers.get("x-admin-pin") ?? req.cookies.get("abraxas_admin_pin")?.value;
  return pin === ADMIN_PIN;
}

export async function canAccessPartnerPortal(req: NextRequest): Promise<boolean> {
  if (hasAdminPin(req)) return true;
  const auth = await resolvePartnerAuth(req, "verify:credential");
  return auth?.ok === true;
}
