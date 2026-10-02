// FILE: app/api/admin/evaluations/two-app/route.ts
// Operator view — who is stuck, where, and why.

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { listAllTwoAppEvaluationsForAdmin } from "@/lib/partner/twoAppEvaluation/store";
import { buildTwoAppEvaluationView } from "@/lib/partner/twoAppEvaluation/buildEvaluation";
import { TWO_APP_EVALUATION_NOTICE } from "@/lib/partner/twoAppEvaluation/contract";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const records = await listAllTwoAppEvaluationsForAdmin();
  const rows = await Promise.all(
    records.map(async (record) => {
      const view = await buildTwoAppEvaluationView(record);
      const msSinceStart = Date.now() - Date.parse(record.started_at);
      return {
        evaluation_id: record.evaluation_id,
        partner_id: record.partner_id,
        evidence_classification: record.evidence_classification,
        started_at: record.started_at,
        stage: view.stage,
        app_a_status: view.app_a.server_verification_passed ? "verified" : "pending",
        app_b_status: view.app_b.server_verification_passed ? "verified" : "pending",
        reuse_status: view.reuse.status,
        time_since_start_ms: Number.isFinite(msSinceStart) ? msSinceStart : null,
        blockers: view.blockers,
        evidence_ready: view.evidence_packet_ready,
        commercial_success_event: view.commercial_success_event,
      };
    }),
  );

  return NextResponse.json({
    ok: true,
    notice: TWO_APP_EVALUATION_NOTICE,
    evaluations: rows,
  }, { headers: { "Cache-Control": "no-store" } });
}
