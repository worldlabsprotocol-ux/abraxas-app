// FILE: components/account/TrustExecutionTrace.test.tsx

import { describe, expect, it } from "vitest";
import { deriveTrustExecutionStages } from "./TrustExecutionTrace";

describe("deriveTrustExecutionStages", () => {
  it("marks evidence requirements before presentation is prepared", () => {
    const stages = deriveTrustExecutionStages({
      phase: "workspace",
      policySelected: true,
      presentationPrepared: false,
      presentationAuthorized: false,
      evidenceRequired: true,
      decision: null,
      receiptValidationStatus: "not_applicable",
      errorActive: false,
    });
    expect(stages.find((s) => s.id === "application")?.state).toBe("active");
    expect(stages.find((s) => s.id === "evidence")?.state).toBe("requirements");
    expect(stages.find((s) => s.id === "decision")?.state).toBe("pending");
  });

  it("keeps validation active until independent receipt check completes", () => {
    const stages = deriveTrustExecutionStages({
      phase: "result",
      policySelected: true,
      presentationPrepared: true,
      presentationAuthorized: true,
      evidenceRequired: false,
      decision: "approved",
      receiptValidationStatus: "idle",
      errorActive: false,
    });
    expect(stages.find((s) => s.id === "validation")?.state).toBe("active");
    expect(stages.find((s) => s.id === "decision")?.state).toBe("complete");
  });

  it("marks validation complete only after validated status", () => {
    const stages = deriveTrustExecutionStages({
      phase: "result",
      policySelected: true,
      presentationPrepared: true,
      presentationAuthorized: true,
      evidenceRequired: true,
      decision: "approved",
      receiptValidationStatus: "validated",
      errorActive: false,
    });
    expect(stages.find((s) => s.id === "validation")?.state).toBe("complete");
  });
});
