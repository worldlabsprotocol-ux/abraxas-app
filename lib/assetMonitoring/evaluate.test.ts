// FILE: lib/assetMonitoring/evaluate.test.ts

import { describe, expect, it } from "vitest";
import { evaluateAssetSignal, monitoringActionToClaimStatus } from "./evaluate";
import type { AssetSignal } from "./types";

const base: AssetSignal = {
  assetId: "ABX-RE-RES-002",
  signalType: "ownership_transfer",
  observedAt: "2026-07-18T00:00:00.000Z",
  source: "county_recorder",
};

describe("evaluateAssetSignal", () => {
  it("fail-closes on ownership transfer", () => {
    const d = evaluateAssetSignal(base);
    expect(d.failClosed).toBe(true);
    expect(d.action).toBe("refresh");
    expect(d.claimStatus).toBe("under_review");
  });

  it("suspends on new lien", () => {
    const d = evaluateAssetSignal({ ...base, signalType: "lien_recorded" });
    expect(d.claimStatus).toBe("suspended");
    expect(monitoringActionToClaimStatus(d)).toBe("suspended");
  });

  it("flags appraisal expiry for refresh", () => {
    const d = evaluateAssetSignal({ ...base, signalType: "appraisal_expired" });
    expect(d.reasonCode).toBe("asset.appraisal_expired");
  });
});
