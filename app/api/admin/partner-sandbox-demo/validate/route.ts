// FILE: app/api/admin/partner-sandbox-demo/validate/route.ts

import { NextRequest } from "next/server";
import {
  DEMO_SANDBOX_PARTNER_ID,
  DEMO_SANDBOX_POLICY_ID,
  rejectClientSuppliedSubject,
  validateDemoReceiptId,
} from "@/lib/demo/partnerSandboxDemoBoundaries";
import { guardPartnerSandboxDemoRoute, partnerSandboxDemoJson } from "@/lib/demo/partnerSandboxDemoRouteGuard";
import { validatePartnerSandboxDemoReceipt } from "@/lib/demo/partnerSandboxDemoService";
import { demoViewHasNoForbiddenKeys } from "@/lib/demo/partnerSandboxDemoViews";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const blocked = guardPartnerSandboxDemoRoute(req);
  if (blocked) return blocked;

  try {
    rejectClientSuppliedSubject({
      querySubjectId: req.nextUrl.searchParams.get("subject_id"),
    });

    const rawReceiptId = req.nextUrl.searchParams.get("receipt_id") ?? "";
    const validated = validateDemoReceiptId(rawReceiptId);
    if (!validated.ok) {
      return partnerSandboxDemoJson({ error: validated.error }, { status: 400 });
    }

    const receipt = await validatePartnerSandboxDemoReceipt(validated.receiptId);
    if (!demoViewHasNoForbiddenKeys(receipt as unknown as Record<string, unknown>)) {
      throw new Error("demo_receipt_view_unsafe");
    }
    return partnerSandboxDemoJson({
      ok: true,
      partner_id: DEMO_SANDBOX_PARTNER_ID,
      policy_id: DEMO_SANDBOX_POLICY_ID,
      receipt,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "validation_failed";
    const status = msg.includes("not_allowed") || msg.includes("not_sandbox") ? 403 : 400;
    return partnerSandboxDemoJson({ error: msg }, { status });
  }
}
