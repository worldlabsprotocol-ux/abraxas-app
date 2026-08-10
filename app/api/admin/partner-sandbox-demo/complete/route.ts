// FILE: app/api/admin/partner-sandbox-demo/complete/route.ts

import { NextRequest } from "next/server";
import { rejectClientSuppliedSubject } from "@/lib/demo/partnerSandboxDemoBoundaries";
import {
  classifyPartnerSandboxDemoError,
  logPartnerSandboxDemoInternalError,
} from "@/lib/demo/partnerSandboxDemoErrors";
import { guardPartnerSandboxDemoRoute, partnerSandboxDemoJson } from "@/lib/demo/partnerSandboxDemoRouteGuard";
import { completePartnerSandboxDemoReceipt } from "@/lib/demo/partnerSandboxDemoService";
import {
  DEMO_COMPLETION_FIELDS,
  demoResponseHasNoOperationalClaims,
  demoViewHasNoForbiddenKeys,
  demoViewHasOnlyAllowedKeys,
  toDemoCompletionView,
} from "@/lib/demo/partnerSandboxDemoViews";

export const dynamic = "force-dynamic";

const OPERATION = "partner_sandbox_demo.complete";

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

    const issuance = toDemoCompletionView(await completePartnerSandboxDemoReceipt());
    if (!demoViewHasOnlyAllowedKeys(issuance as unknown as Record<string, unknown>, DEMO_COMPLETION_FIELDS)) {
      throw new Error("demo_completion_view_unsafe");
    }
    if (!demoViewHasNoForbiddenKeys(issuance as unknown as Record<string, unknown>)) {
      throw new Error("demo_completion_view_unsafe");
    }
    if (!demoResponseHasNoOperationalClaims(issuance)) {
      throw new Error("demo_completion_view_unsafe");
    }
    return partnerSandboxDemoJson({ ok: true, issuance });
  } catch (error: unknown) {
    const classified = classifyPartnerSandboxDemoError(error);
    if (classified.status === 500) {
      logPartnerSandboxDemoInternalError(OPERATION, error);
    }
    return partnerSandboxDemoJson({ error: classified.error }, { status: classified.status });
  }
}
