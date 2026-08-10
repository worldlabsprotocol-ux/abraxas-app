// FILE: app/api/admin/partner-sandbox-demo/evaluate/route.ts

import { NextRequest } from "next/server";
import { rejectClientSuppliedSubject } from "@/lib/demo/partnerSandboxDemoBoundaries";
import { guardPartnerSandboxDemoRoute, partnerSandboxDemoJson } from "@/lib/demo/partnerSandboxDemoRouteGuard";
import { evaluatePartnerSandboxDemoPolicy } from "@/lib/demo/partnerSandboxDemoService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const blocked = guardPartnerSandboxDemoRoute(req);
  if (blocked) return blocked;

  try {
    const body = await req.json().catch(() => ({})) as {
      subject_id?: string;
      partner_id?: string;
      policy_id?: string;
    };
    rejectClientSuppliedSubject({ bodySubjectId: body.subject_id });
    if (body.partner_id?.trim() || body.policy_id?.trim()) {
      return partnerSandboxDemoJson({ error: "client_partner_policy_not_allowed" }, { status: 400 });
    }

    const evaluation = await evaluatePartnerSandboxDemoPolicy();
    return partnerSandboxDemoJson({ ok: true, evaluation });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "evaluation_failed";
    const status = msg.includes("not_configured") ? 503 : 400;
    return partnerSandboxDemoJson({ error: msg }, { status });
  }
}
