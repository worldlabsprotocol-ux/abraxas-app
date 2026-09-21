// FILE: lib/partner/policyReleaseCandidate/csrf.ts

import type { NextRequest } from "next/server";
import { productionReviewCsrfRejected } from "@/lib/partner/launchpad/productionReview/csrf";
import { createReleaseOverride, decideReleaseOverride } from "./sanitize";

export function policyRcCsrfRejected(req: NextRequest) {
  return productionReviewCsrfRejected(req);
}

export { createReleaseOverride, decideReleaseOverride };
