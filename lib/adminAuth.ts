// FILE: lib/adminAuth.ts
// Shared admin PIN check for pilot review endpoints.
// Production uses server-only ADMIN_PIN — never NEXT_PUBLIC_ADMIN_PIN.

import type { NextRequest } from "next/server";

function resolveAdminPin(): string {
  const serverPin = process.env.ADMIN_PIN?.trim();
  if (serverPin) return serverPin;

  // Dev/preview only — public env must not gate production admin APIs.
  if (process.env.NODE_ENV === "production") return "";
  return process.env.NEXT_PUBLIC_ADMIN_PIN?.trim() ?? "";
}

export function isAdminPinConfigured(): boolean {
  return resolveAdminPin().length > 0;
}

export function checkAdmin(req: NextRequest): boolean {
  const pin = resolveAdminPin();
  if (!pin) return false;
  return req.headers.get("x-admin-pin") === pin;
}
