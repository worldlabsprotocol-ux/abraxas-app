import type { NextRequest } from "next/server";
import { resolveAdminAccess, resolveStrictProductionAdminAccess, shouldEnforceStrictProductionAdminAccess } from "@/lib/adminAuth";

/** Authoritative reviewer identity from admin session — never trust client-supplied reviewer fields. */
export async function resolveAdminReviewerId(req: NextRequest): Promise<string | null> {
  const access = shouldEnforceStrictProductionAdminAccess()
    ? await resolveStrictProductionAdminAccess(req)
    : await resolveAdminAccess(req);
  if (!access.authorized) return null;
  if (access.email?.includes("@")) return access.email.trim().toLowerCase();
  if (access.method === "pin_header" || access.method === "pin_cookie") return "admin_pin_session";
  return null;
}
