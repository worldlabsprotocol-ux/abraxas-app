import { describe, expect, it } from "vitest";
import { partnerFlowErrorPresentation } from "@/lib/partner/holderFlowErrorPresentation";

describe("holderFlowErrorPresentation", () => {
  it("includes safe correlation reference", () => {
    const view = partnerFlowErrorPresentation({
      code: "tuple_conflict",
      correlationId: "pv_a1b2c3d4",
    });
    expect(view.supportRef).toBe("pv_a1b2c3d4");
    expect(view.nextStep).toMatch(/partner/i);
  });
});
