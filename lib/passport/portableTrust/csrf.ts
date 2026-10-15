// FILE: lib/passport/portableTrust/csrf.ts

import type { NextRequest } from "next/server";

export type PortableTrustCsrfFailure = "csrf_required" | "csrf_origin_mismatch";

/** Same-origin protection for authenticated holder export POSTs. */
export function portableTrustCsrfRejected(req: NextRequest): PortableTrustCsrfFailure | null {
  const origin = req.headers.get("origin")?.trim();
  if (!origin) return "csrf_required";
  try {
    if (new URL(origin).origin !== new URL(req.url).origin) return "csrf_origin_mismatch";
  } catch {
    return "csrf_required";
  }
  return null;
}
