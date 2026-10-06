"use client";
// FILE: app/evaluation/two-app/TwoAppEvaluationClient.tsx

import { useSearchParams } from "next/navigation";
import { TwoAppEvaluationJourney } from "@/components/evaluation/TwoAppEvaluationJourney";

export function TwoAppEvaluationClient() {
  const params = useSearchParams();
  const evaluationId = params.get("id");
  return <TwoAppEvaluationJourney evaluationId={evaluationId} />;
}
