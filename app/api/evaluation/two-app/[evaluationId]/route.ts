// FILE: app/api/evaluation/two-app/[evaluationId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { enforceLaunchpadRateLimit, launchpadError } from "@/lib/partner/launchpad/apiHelpers";
import { loadTwoAppEvaluationRecord } from "@/lib/partner/twoAppEvaluation/store";
import { buildTwoAppEvaluationView, buildTwoAppEvaluationEvidenceExport } from "@/lib/partner/twoAppEvaluation/buildEvaluation";
import { TWO_APP_EVALUATION_NOTICE } from "@/lib/partner/twoAppEvaluation/contract";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { evaluationId: string } },
) {
  const limited = await enforceLaunchpadRateLimit(req, "/api/evaluation/two-app/status", 60);
  if (limited) return limited;

  const evaluationId = params.evaluationId?.trim();
  if (!evaluationId) return launchpadError("invalid_input", 400);

  const record = await loadTwoAppEvaluationRecord(evaluationId);
  if (!record) return launchpadError("not_found", 404);

  const exportEvidence = req.nextUrl.searchParams.get("export") === "evidence";
  const view = await buildTwoAppEvaluationView(record);

  if (exportEvidence) {
    const packet = await buildTwoAppEvaluationEvidenceExport(record);
    return NextResponse.json({ ok: true, notice: TWO_APP_EVALUATION_NOTICE, packet }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json({
    ok: true,
    notice: TWO_APP_EVALUATION_NOTICE,
    evaluation: {
      evaluation_id: view.record.evaluation_id,
      partner_id: view.record.partner_id,
      stage: view.stage,
      stage_source: view.stage_source,
      evidence_classification: view.record.evidence_classification,
      classification_source: view.record.classification_source,
      classified_at: view.record.classified_at,
      technical_evaluation_status: view.technical_evaluation_status,
      external_proof_eligibility: view.external_proof_eligibility,
      commercial_success_event: view.commercial_success_event,
      app_a: view.app_a,
      app_b: view.app_b,
      reuse: view.reuse,
      reuse_metrics: view.reuse_metrics,
      time_to_value: view.time_to_value,
      payload_comparison: view.payload_comparison,
      success_criteria: view.success_criteria,
      partner_summary: view.partner_summary,
      blockers: view.blockers,
      target_policy_pack: view.record.target_policy_pack,
      started_at: view.record.started_at,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
