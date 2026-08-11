// FILE: app/api/admin/partner-sandbox-demo/evaluate/route.ts

import { NextRequest } from "next/server";
import { rejectClientSuppliedSubject } from "@/lib/demo/partnerSandboxDemoBoundaries";
import {
  classifyPartnerSandboxDemoError,
  logPartnerSandboxDemoInternalError,
} from "@/lib/demo/partnerSandboxDemoErrors";
import { guardPartnerSandboxDemoRoute, partnerSandboxDemoJson } from "@/lib/demo/partnerSandboxDemoRouteGuard";
import { evaluatePartnerSandboxDemoPolicy } from "@/lib/demo/partnerSandboxDemoService";
import {
  DEMO_EVALUATION_FIELDS,
  demoViewHasNoForbiddenKeys,
  demoViewHasOnlyAllowedKeys,
  toDemoEvaluationView,
} from "@/lib/demo/partnerSandboxDemoViews";

export const dynamic = "force-dynamic";

const OPERATION = "partner_sandbox_demo.evaluate";

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

    const evaluation = toDemoEvaluationView(await evaluatePartnerSandboxDemoPolicy());
    if (!demoViewHasOnlyAllowedKeys(evaluation as unknown as Record<string, unknown>, DEMO_EVALUATION_FIELDS)) {
      throw new Error("demo_evaluation_view_unsafe");
    }
    if (!demoViewHasNoForbiddenKeys(evaluation as unknown as Record<string, unknown>)) {
      throw new Error("demo_evaluation_view_unsafe");
    }
    return partnerSandboxDemoJson({ ok: true, evaluation });
  } catch (error: unknown) {
    const classified = classifyPartnerSandboxDemoError(error);
    if (classified.status === 500) {
      logPartnerSandboxDemoInternalError(OPERATION, error);
    }
    return partnerSandboxDemoJson({ error: classified.error }, { status: classified.status });
  }
}
