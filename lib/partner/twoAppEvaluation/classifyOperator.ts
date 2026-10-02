// FILE: lib/partner/twoAppEvaluation/classifyOperator.ts
// Operator-only classification — no partner self-assertion.

import type { TwoAppEvidenceClassification } from "./contract";
import { TWO_APP_EVIDENCE_CLASSIFICATIONS } from "./contract";
import type { TwoAppClassificationSource } from "./classification";
import { loadTwoAppEvaluationRecord, saveTwoAppEvaluationRecord } from "./store";
import { recordValueOperatorAudit } from "@/lib/partner/valueEvidence/store";

export type ClassifyTwoAppEvaluationInput = {
  evaluationId: string;
  classification: TwoAppEvidenceClassification;
  operatorActor: string;
  source?: TwoAppClassificationSource;
};

export type ClassifyTwoAppEvaluationResult =
  | { ok: true; record: Awaited<ReturnType<typeof loadTwoAppEvaluationRecord>> & {} }
  | { ok: false; code: string };

export function isAllowedOperatorClassification(
  value: unknown,
): value is TwoAppEvidenceClassification {
  return typeof value === "string"
    && (TWO_APP_EVIDENCE_CLASSIFICATIONS as readonly string[]).includes(value);
}

export async function classifyTwoAppEvaluationByOperator(
  input: ClassifyTwoAppEvaluationInput,
): Promise<ClassifyTwoAppEvaluationResult> {
  const evaluationId = input.evaluationId.trim();
  if (!evaluationId) return { ok: false, code: "invalid_input" };
  if (!isAllowedOperatorClassification(input.classification)) {
    return { ok: false, code: "invalid_classification" };
  }

  const record = await loadTwoAppEvaluationRecord(evaluationId);
  if (!record) return { ok: false, code: "not_found" };

  const classifiedAt = new Date().toISOString();
  const updated = {
    ...record,
    evidence_classification: input.classification,
    operator_classification_override: input.classification,
    classification_source: input.source ?? "operator_review",
    classified_at: classifiedAt,
    classification_operator_ref: input.operatorActor,
  };

  await saveTwoAppEvaluationRecord(updated);
  await recordValueOperatorAudit({
    partnerId: record.partner_id,
    eventType: "two_app_evaluation_classified",
    publicCode: "two_app_evaluation",
    operatorActor: input.operatorActor,
    metadata: {
      evaluation_id: evaluationId,
      evidence_class: input.classification,
      classification_source: input.source ?? "operator_review",
    },
  });

  return { ok: true, record: updated };
}
