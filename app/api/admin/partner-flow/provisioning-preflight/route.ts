// FILE: app/api/admin/partner-flow/provisioning-preflight/route.ts
// Production-only boolean partner provisioning preflight — read-only, no policy content in response.

import { NextRequest } from "next/server";
import { resolveStrictProductionAdminAccess } from "@/lib/adminAuth";
import {
  evaluatePartnerProvisioningPreflight,
  provisioningPreflightResponseHasNoSecrets,
} from "@/lib/admin/partnerProvisioningPreflight";
import {
  guardPartnerFlowProductionReadinessRoute,
  partnerFlowReadinessJson,
} from "@/lib/admin/partnerFlowProductionRouteGate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const blocked = guardPartnerFlowProductionReadinessRoute(req);
  if (blocked) return blocked;

  const access = await resolveStrictProductionAdminAccess(req);
  if (!access.authorized) {
    return partnerFlowReadinessJson({ error: "Unauthorized" }, { status: 401 });
  }

  const partnerId = req.nextUrl.searchParams.get("partner_id") ?? "";
  const policyId = req.nextUrl.searchParams.get("policy_id") ?? "";
  const returnUrl = req.nextUrl.searchParams.get("return_url") ?? "";

  let report;
  try {
    report = await evaluatePartnerProvisioningPreflight({ partnerId, policyId, returnUrl });
  } catch (error: unknown) {
    console.error("partner_flow.provisioning_preflight_failed", error);
    return partnerFlowReadinessJson({ error: "Internal server error" }, { status: 500 });
  }

  if (!provisioningPreflightResponseHasNoSecrets(report)) {
    console.error("partner_flow.provisioning_preflight_response_unsafe");
    return partnerFlowReadinessJson({ error: "Internal server error" }, { status: 500 });
  }

  return partnerFlowReadinessJson(report);
}
