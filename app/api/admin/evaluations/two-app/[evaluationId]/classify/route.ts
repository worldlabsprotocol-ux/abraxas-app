// FILE: app/api/admin/evaluations/two-app/[evaluationId]/classify/route.ts
// Operator-only evidence classification — no public or partner self-assertion.

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { resolveDesignPartnerAdminActorCategory } from "@/lib/admin/designPartnerAdminActor";
import {
  classifyTwoAppEvaluationByOperator,
  isAllowedOperatorClassification,
} from "@/lib/partner/twoAppEvaluation/classifyOperator";
import { TWO_APP_EVALUATION_NOTICE } from "@/lib/partner/twoAppEvaluation/contract";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{  evaluationId: string  }> },
) {
  const routeParams = await params;
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const evaluationId = routeParams.evaluationId?.trim();
  if (!evaluationId) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const classification = body.classification;
  if (!isAllowedOperatorClassification(classification)) {
    return NextResponse.json({ ok: false, error: "invalid_classification" }, { status: 400 });
  }

  const operatorActor = await resolveDesignPartnerAdminActorCategory(req);
  const result = await classifyTwoAppEvaluationByOperator({
    evaluationId,
    classification,
    operatorActor,
  });

  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 400;
    return NextResponse.json({ ok: false, error: result.code }, { status });
  }

  return NextResponse.json({
    ok: true,
    notice: TWO_APP_EVALUATION_NOTICE,
    evaluation_id: result.record.evaluation_id,
    evidence_classification: result.record.evidence_classification,
    classification_source: result.record.classification_source,
    classified_at: result.record.classified_at,
    classification_operator_ref: result.record.classification_operator_ref,
  }, { headers: { "Cache-Control": "no-store" } });
}
