import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { evaluateInstitutionalEnvironmentReadiness } from "@/lib/institutional/integration/institutionalEnvironmentReadiness";
import { getInstitutionalIntegrationContract } from "@/lib/institutional/integration/institutionalIntegrationContract";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const readiness = await evaluateInstitutionalEnvironmentReadiness();
  return NextResponse.json({
    ok: true,
    contract: getInstitutionalIntegrationContract(),
    readiness,
  });
}
