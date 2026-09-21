// FILE: lib/verification/issuerTrust/csrf.ts

import type { NextRequest } from "next/server";
import { productionReviewCsrfRejected } from "@/lib/partner/launchpad/productionReview/csrf";
import { ISSUER_TRUST_OVERRIDE_KEYS } from "./contract";

export function issuerTrustCsrfRejected(req: NextRequest) {
  return productionReviewCsrfRejected(req);
}

export function issuerTrustClientOverride(body: unknown): boolean {
  if (body == null) return false;
  if (typeof body !== "object" || Array.isArray(body)) return true;
  const record = body as Record<string, unknown>;
  return Object.keys(record).length > 0
    || ISSUER_TRUST_OVERRIDE_KEYS.some((key) => Object.prototype.hasOwnProperty.call(record, key));
}
