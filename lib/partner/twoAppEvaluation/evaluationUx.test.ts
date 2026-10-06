// FILE: lib/partner/twoAppEvaluation/evaluationUx.test.ts

import { describe, expect, it } from "vitest";
import {
  buildEvaluationProgressSteps,
  deriveEvaluationNextStep,
  humanStageLabel,
  reuseCausalityHeadline,
} from "./evaluationUx";

describe("evaluationUx", () => {
  it("humanStageLabel maps known stages", () => {
    expect(humanStageLabel("app_a_result_verified")).toBe("App A verified");
    expect(humanStageLabel("unknown_stage")).toBe("unknown stage");
  });

  it("buildEvaluationProgressSteps marks current step after sandbox", () => {
    const steps = buildEvaluationProgressSteps({
      stage: "sandbox_ready",
      app_a_verified: false,
      app_b_verified: false,
      reuse_accepted: false,
    });
    expect(steps.find((s) => s.id === "sandbox")?.status).toBe("complete");
    expect(steps.find((s) => s.id === "app_a")?.status).toBe("current");
  });

  it("deriveEvaluationNextStep prioritizes App A before reuse", () => {
    const next = deriveEvaluationNextStep({
      stage: "sandbox_ready",
      app_a: {
        application_id: "app-a",
        items: [{ id: "configured", label: "Configure application", status: "pending" }],
        server_verification_passed: false,
      },
      app_b: {
        application_id: "app-b",
        items: [],
        server_verification_passed: false,
      },
      reuse_status: "not_yet_observed",
      evaluation_id: "eval-1",
    });
    expect(next.title).toContain("App A");
    expect(next.primaryHref).toContain("app-a");
  });

  it("reuseCausalityHeadline highlights canonical reuse moment", () => {
    expect(
      reuseCausalityHeadline({
        underlying_verification_events: 1,
        applications_with_verified_results: 2,
        additional_raw_kyc_recollections: 0,
      }),
    ).toBe("One verification supported two application decisions");
  });
});
