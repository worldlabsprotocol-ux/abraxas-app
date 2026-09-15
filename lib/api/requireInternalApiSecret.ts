// FILE: lib/api/requireInternalApiSecret.ts
// Timing-safe internal API secret gate for privileged server routes.

import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

function timingSafeEqualString(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);
  if (leftBuf.length !== rightBuf.length) return false;
  return timingSafeEqual(leftBuf, rightBuf);
}

export type InternalApiSecretCheckResult =
  | { ok: true }
  | { ok: false; status: 403 | 503; code: string; message: string };

export function checkInternalApiSecret(req: NextRequest): InternalApiSecretCheckResult {
  const configured = process.env.INTERNAL_API_SECRET?.trim();
  if (!configured) {
    return {
      ok: false,
      status: 503,
      code: "credential_issuance_not_configured",
      message: "Credential issuance is not configured for this environment.",
    };
  }

  const provided = req.headers.get("x-internal-secret") ?? "";
  if (!timingSafeEqualString(provided, configured)) {
    return {
      ok: false,
      status: 403,
      code: "credential_issuance_forbidden",
      message: "Credential issuance is restricted to verified IDV pipeline. Use /api/idv/webhook.",
    };
  }

  return { ok: true };
}
