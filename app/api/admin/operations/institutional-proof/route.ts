// FILE: app/api/admin/operations/institutional-proof/route.ts
// Admin access to institutional proof evidence packet (reference harness only).

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { assembleInstitutionalEvidencePacket } from "@/lib/operations/institutionalProof/assembleEvidencePacket";
import { renderInstitutionalProofReport } from "@/lib/operations/institutionalProof/renderReport";
import { renderInstitutionalDiligenceSummary } from "@/lib/operations/institutionalProof/renderDiligenceSummary";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const format = req.nextUrl.searchParams.get("format") ?? "json";

  if (process.env.NODE_ENV === "production" && !process.env.INSTITUTIONAL_PROOF_ADMIN_ENABLED) {
    return NextResponse.json({
      error: "institutional_proof_admin_disabled_in_production",
      message: "Reference harness evidence is not exposed in production by default.",
    }, { status: 403 });
  }

  return NextResponse.json({
    error: "reference_harness_requires_test_execution",
    message: "Run lib/operations/institutionalProof/referenceScenario.test.ts or CI job to generate evidence.",
    format,
    endpoints: {
      json: "/api/admin/operations/institutional-proof?format=json",
      markdown: "/api/admin/operations/institutional-proof?format=markdown",
    },
    modules: {
      assemble: "assembleInstitutionalEvidencePacket",
      report: "renderInstitutionalProofReport",
      diligence: "renderInstitutionalDiligenceSummary",
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
