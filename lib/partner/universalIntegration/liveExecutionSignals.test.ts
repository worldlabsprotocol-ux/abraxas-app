import { describe, expect, it } from "vitest";
import { deriveLiveExecutionSignals } from "./liveExecutionSignals";

describe("deriveLiveExecutionSignals", () => {
  it("marks live_e2e_complete only with holder + receipt integration events", () => {
    const signals = deriveLiveExecutionSignals({
      harnessPassed: true,
      verifiedReceiptCount: 2,
      integrationEvents: [
        { event_type: "holder_flow_completed" },
        { event_type: "receipt_issued", receipt_id: "dr_1" },
      ],
    });
    expect(signals.live_e2e_complete).toBe(true);
    expect(signals.offline_harness_verified).toBe(false);
  });

  it("keeps offline_harness_verified when harness passed without live holder flow", () => {
    const signals = deriveLiveExecutionSignals({
      harnessPassed: true,
      verifiedReceiptCount: 1,
      integrationEvents: [],
    });
    expect(signals.live_e2e_complete).toBe(false);
    expect(signals.offline_harness_verified).toBe(true);
  });
});
