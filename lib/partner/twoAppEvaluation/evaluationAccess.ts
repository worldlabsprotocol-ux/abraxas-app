// FILE: lib/partner/twoAppEvaluation/evaluationAccess.ts
// Authorize evaluation read/export — owner session, launchpad session, or admin.

import type { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { resolvePartnerConsoleSession } from "@/lib/partner/launchpad/partnerConsoleSession";
import { launchpadError } from "@/lib/partner/launchpad/apiHelpers";
import type { TwoAppEvaluationRecord } from "./contract";
import { resolveTwoAppEvaluationOwnerSession } from "./evaluationSession";

export async function authorizeTwoAppEvaluationAccess(
  req: NextRequest,
  record: TwoAppEvaluationRecord,
): Promise<NextResponse | null> {
  const adminDenied = await requireAdminRouteAccess(req);
  if (!adminDenied) return null;

  const owner = await resolveTwoAppEvaluationOwnerSession(req);
  if (owner?.evaluationId === record.evaluation_id && owner.partnerId === record.partner_id) {
    return null;
  }

  const consoleSession = await resolvePartnerConsoleSession(req);
  if (consoleSession?.partnerId === record.partner_id) {
    return null;
  }

  return launchpadError("unauthorized", 403);
}
