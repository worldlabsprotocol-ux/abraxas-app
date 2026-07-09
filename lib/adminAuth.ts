// FILE: lib/adminAuth.ts
// Shared admin PIN check for pilot review endpoints.

import type { NextRequest } from "next/server";

const ADMIN_PIN = process.env.ADMIN_PIN ?? process.env.NEXT_PUBLIC_ADMIN_PIN ?? "";

export function checkAdmin(req: NextRequest): boolean {
  if (!ADMIN_PIN) return process.env.NODE_ENV !== "production";
  return req.headers.get("x-admin-pin") === ADMIN_PIN;
}
