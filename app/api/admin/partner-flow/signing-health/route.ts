// FILE: app/api/admin/partner-flow/signing-health/route.ts
// Production-only boolean signing health probe for external partner readiness.

import { NextRequest } from "next/server";
import { resolveStrictProductionAdminAccess } from "@/lib/adminAuth";
import {
  evaluateProductionSigningHealth,
  productionSigningHealthResponseHasNoSecrets,
} from "@/lib/admin/productionEnvironmentDiagnostics";
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

  const report = evaluateProductionSigningHealth();
  if (!productionSigningHealthResponseHasNoSecrets(report)) {
    console.error("partner_flow.signing_health_response_unsafe");
    return partnerFlowReadinessJson({ error: "Internal server error" }, { status: 500 });
  }

  return partnerFlowReadinessJson(report);
}
