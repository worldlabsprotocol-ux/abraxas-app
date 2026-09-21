// FILE: lib/partner/policyProposal/csrf.ts

import type { NextRequest } from "next/server";
import { productionReviewCsrfRejected } from "@/lib/partner/launchpad/productionReview/csrf";
import { operatorProposalOverride, partnerProposalOverride } from "./sanitize";

export function policyProposalCsrfRejected(req: NextRequest) {
  return productionReviewCsrfRejected(req);
}

export { partnerProposalOverride, operatorProposalOverride };
