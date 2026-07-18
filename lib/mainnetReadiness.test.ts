import { describe, expect, it } from "vitest";
import {
  MAINNET_READINESS_MILESTONES,
  mainnetReadinessProgress,
} from "./mainnetReadiness";

describe("mainnetReadiness", () => {
  it("defines seven boolean gates", () => {
    expect(MAINNET_READINESS_MILESTONES).toHaveLength(7);
    expect(MAINNET_READINESS_MILESTONES.every(m => m.id && m.href)).toBe(true);
  });

  it("marks core verification as done and mainnet deploy as open", () => {
    const core = MAINNET_READINESS_MILESTONES.find(m => m.id === "core-verification-live");
    const deploy = MAINNET_READINESS_MILESTONES.find(m => m.id === "passport-mainnet-deploy");
    expect(core?.done).toBe(true);
    expect(deploy?.done).toBe(false);
  });

  it("computes progress without claiming full readiness yet", () => {
    const p = mainnetReadinessProgress();
    expect(p.total).toBe(7);
    expect(p.done).toBeGreaterThanOrEqual(1);
    expect(p.done).toBeLessThan(p.total);
    expect(p.isFullyReady).toBe(false);
    expect(p.percent).toBeGreaterThan(0);
    expect(p.percent).toBeLessThan(100);
  });
});
