// FILE: lib/partner/launchpad/productionReview/csrf.ts
// Same-origin POST protection for operator decisions.

import type { NextRequest } from "next/server";
import {
  PRODUCTION_REVIEW_ALLOWED_BODY_KEYS,
  PRODUCTION_REVIEW_CLIENT_OVERRIDE_KEYS,
} from "./contract";

export function productionReviewCsrfRejected(req: NextRequest): "csrf_required" | "csrf_origin_mismatch" | null {
  const origin = req.headers.get("origin")?.trim();
  if (!origin) return "csrf_required";
  try {
    if (new URL(origin).origin !== new URL(req.url).origin) return "csrf_origin_mismatch";
  } catch {
    return "csrf_required";
  }
  return null;
}

export function productionReviewClientOverride(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some((key) => !(PRODUCTION_REVIEW_ALLOWED_BODY_KEYS as readonly string[]).includes(key))) {
    return true;
  }
  return (PRODUCTION_REVIEW_CLIENT_OVERRIDE_KEYS as readonly string[]).some((key) =>
    Object.prototype.hasOwnProperty.call(record, key),
  );
}
