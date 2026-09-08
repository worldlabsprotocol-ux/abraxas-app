// FILE: lib/assurance/selfAttestation/originGuard.ts
// CSRF/origin protection for self-attestation API.

import type { NextRequest } from "next/server";
import {
  getPublicAppOriginFromRequest,
  normalizePublicOrigin,
} from "@/lib/app/publicAppOrigin";
import { SITE_URL } from "@/lib/siteUrl";

function resolveAllowedSelfAttestOrigin(req: NextRequest): string {
  const effectiveOrigin = normalizePublicOrigin(getPublicAppOriginFromRequest(req));

  if (process.env.VERCEL_ENV === "production") {
    return normalizePublicOrigin(SITE_URL);
  }

  return effectiveOrigin;
}

export function assertSelfAttestOrigin(req: NextRequest): { ok: true } | { ok: false; code: string } {
  const originHeader = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const allowed = resolveAllowedSelfAttestOrigin(req);

  if (originHeader === "null") {
    return { ok: false, code: "origin_not_allowed" };
  }

  if (originHeader) {
    try {
      if (normalizePublicOrigin(originHeader) === allowed) {
        return { ok: true };
      }
    } catch {
      return { ok: false, code: "origin_not_allowed" };
    }
    return { ok: false, code: "origin_not_allowed" };
  }

  if (referer) {
    try {
      const refererOrigin = normalizePublicOrigin(new URL(referer).origin);
      if (refererOrigin === allowed) {
        return { ok: true };
      }
    } catch {
      return { ok: false, code: "origin_not_allowed" };
    }
  }

  if (process.env.NODE_ENV === "development") {
    return { ok: true };
  }

  return { ok: false, code: "origin_required" };
}
