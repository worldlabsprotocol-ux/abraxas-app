// FILE: components/account/TrustExecutionTrace.test.tsx

import { describe, expect, it } from "vitest";
import { deriveTrustExecutionStages } from "./TrustExecutionTrace";

describe("deriveTrustExecutionStages", () => {
  it("marks evidence requirements before presentation is prepared", () => {
    const stages = deriveTrustExecutionStages({
      phase: "workspace",
      policySelected: true,
      presentationPrepared: false,
      evidenceRequired: true,
      decision: null,
      validation: null,
      errorActive: false,
    });
    const evidence = stages.find((s) => s.id === "evidence");
    expect(evidence?.state).toBe("requirements");
  });

  it("advances verification only after validate response", () => {
    const stages = deriveTrustExecutionStages({
      phase: "result",
      policySelected: true,
      presentationPrepared: true,
      evidenceRequired: true,
      decision: "approved",
      validation: { signature_authentic: true, currently_acceptable: true },
      errorActive: false,
    });
    const verification = stages.find((s) => s.id === "verification");
    expect(verification?.state).toBe("complete");
  });
});
