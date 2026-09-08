// FILE: lib/assurance/selfAttestation/originGuard.ts
// CSRF/origin protection for self-attestation API.

import type { NextRequest } from "next/server";
import { getPublicAppOrigin } from "@/lib/app/publicAppOrigin";

export function assertSelfAttestOrigin(req: NextRequest): { ok: true } | { ok: false; code: string } {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const allowed = getPublicAppOrigin().replace(/\/$/, "");

  if (origin) {
    if (origin.replace(/\/$/, "") === allowed) return { ok: true };
    return { ok: false, code: "origin_not_allowed" };
  }

  if (referer?.startsWith(`${allowed}/`)) return { ok: true };

  if (process.env.NODE_ENV === "development") return { ok: true };

  return { ok: false, code: "origin_required" };
}
