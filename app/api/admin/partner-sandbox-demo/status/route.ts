// FILE: app/api/admin/partner-sandbox-demo/status/route.ts

import { NextRequest } from "next/server";
import { rejectClientSuppliedSubject } from "@/lib/demo/partnerSandboxDemoBoundaries";
import { guardPartnerSandboxDemoRoute, partnerSandboxDemoJson } from "@/lib/demo/partnerSandboxDemoRouteGuard";
import { getPartnerSandboxDemoPassportStatus } from "@/lib/demo/partnerSandboxDemoService";
import { demoViewHasNoForbiddenKeys } from "@/lib/demo/partnerSandboxDemoViews";

export const dynamic = "force-dynamic";

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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "status_unavailable";
    const status = msg.includes("not_configured") ? 503 : 400;
    return partnerSandboxDemoJson({ error: msg }, { status });
  }
}
