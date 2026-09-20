// FILE: lib/partner/launchpad/productionCredentials/csrf.ts

import type { NextRequest } from "next/server";
import {
  PRODUCTION_CREDENTIAL_ALLOWED_BODY_KEYS,
  PRODUCTION_CREDENTIAL_CLIENT_OVERRIDE_KEYS,
} from "./contract";
import { productionReviewCsrfRejected } from "@/lib/partner/launchpad/productionReview/csrf";

export function productionCredentialCsrfRejected(req: NextRequest) {
  return productionReviewCsrfRejected(req);
}

export function productionCredentialClientOverride(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some((key) => !(PRODUCTION_CREDENTIAL_ALLOWED_BODY_KEYS as readonly string[]).includes(key))) {
    return true;
  }
  return (PRODUCTION_CREDENTIAL_CLIENT_OVERRIDE_KEYS as readonly string[]).some((key) =>
    Object.prototype.hasOwnProperty.call(record, key),
  );
}
