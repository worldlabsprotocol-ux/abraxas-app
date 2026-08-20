// FILE: app/api/admin/partner-sandbox-demo/validate/route.ts

import { NextRequest } from "next/server";
import {
  DEMO_SANDBOX_PARTNER_ID,
  DEMO_SANDBOX_POLICY_ID,
  rejectClientSuppliedSubject,
  validateDemoReceiptId,
} from "@/lib/demo/partnerSandboxDemoBoundaries";
import {
  classifyPartnerSandboxDemoError,
  logPartnerSandboxDemoInternalError,
} from "@/lib/demo/partnerSandboxDemoErrors";
import { guardPartnerSandboxDemoRoute, partnerSandboxDemoJson } from "@/lib/demo/partnerSandboxDemoRouteGuard";
import {
  diagnosePartnerSandboxDemoReceiptIntegrity,
  validatePartnerSandboxDemoReceipt,
} from "@/lib/demo/partnerSandboxDemoService";
import { demoViewHasNoForbiddenKeys } from "@/lib/demo/partnerSandboxDemoViews";
import { integrityResponseHasNoSecrets } from "@/lib/decisionReceipts/receiptIntegrityDiagnostics";

export const dynamic = "force-dynamic";

const OPERATION = "partner_sandbox_demo.validate";

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

    if (req.nextUrl.searchParams.get("integrity") === "1") {
      const integrity = await diagnosePartnerSandboxDemoReceiptIntegrity(validated.receiptId);
      if (!integrityResponseHasNoSecrets(integrity)) {
        throw new Error("demo_receipt_integrity_response_unsafe");
      }
      return partnerSandboxDemoJson(integrity);
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
  } catch (error: unknown) {
    const classified = classifyPartnerSandboxDemoError(error);
    if (classified.status === 500) {
      logPartnerSandboxDemoInternalError(OPERATION, error);
    }
    return partnerSandboxDemoJson({ error: classified.error }, { status: classified.status });
  }
}
