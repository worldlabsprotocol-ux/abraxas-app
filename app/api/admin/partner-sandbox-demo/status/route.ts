// FILE: app/api/admin/partner-sandbox-demo/status/route.ts

import { NextRequest } from "next/server";
import { rejectClientSuppliedSubject } from "@/lib/demo/partnerSandboxDemoBoundaries";
import {
  classifyPartnerSandboxDemoError,
  logPartnerSandboxDemoInternalError,
} from "@/lib/demo/partnerSandboxDemoErrors";
import { guardPartnerSandboxDemoRoute, partnerSandboxDemoJson } from "@/lib/demo/partnerSandboxDemoRouteGuard";
import { getPartnerSandboxDemoPassportStatus } from "@/lib/demo/partnerSandboxDemoService";
import { demoViewHasNoForbiddenKeys } from "@/lib/demo/partnerSandboxDemoViews";

export const dynamic = "force-dynamic";

const OPERATION = "partner_sandbox_demo.status";

export async function GET(req: NextRequest) {
  const blocked = guardPartnerSandboxDemoRoute(req);
  if (blocked) return blocked;

  try {
    rejectClientSuppliedSubject({
      querySubjectId: req.nextUrl.searchParams.get("subject_id"),
    });

    const status = await getPartnerSandboxDemoPassportStatus();
    if (!demoViewHasNoForbiddenKeys(status as unknown as Record<string, unknown>)) {
      throw new Error("demo_passport_status_unsafe");
    }
    return partnerSandboxDemoJson({ ok: true, passport: status });
  } catch (error: unknown) {
    const classified = classifyPartnerSandboxDemoError(error);
    if (classified.status === 500) {
      logPartnerSandboxDemoInternalError(OPERATION, error);
    }
    return partnerSandboxDemoJson({ error: classified.error }, { status: classified.status });
  }
}
