import { describe, expect, it } from "vitest";
import { verificationLayerProgress } from "./verificationLayerProgress";
import type { VerificationLayerStatus } from "./verificationLayerStatus";

function mockStatus(liveCount: number): VerificationLayerStatus {
  const ids = [
    "independent-biometric-idv",
    "credentials-verify",
    "proof-lookup",
    "sui-anchoring",
    "production-demo",
    "agent-readiness",
    "asset-monitoring",
    "e2e-loop",
  ];
  return {
    summary: "test",
    signing_configured: liveCount > 0,
    verification_key_configured: liveCount > 0,
    supabase_configured: liveCount >= 2,
    sui_network: "devnet",
    independent_idv_status: liveCount > 0 ? "live" : "not_configured",
    items: ids.map((id, i) => ({
      id,
      label: id,
      status: i < liveCount ? "live" : "not_configured",
      detail: "",
      blockers: i < liveCount ? [] : ["missing"],
    })),
  };
}

describe("verificationLayerProgress", () => {
  it("tracks eight verification-layer items", () => {
    const p = verificationLayerProgress(mockStatus(1));
    expect(p.total).toBe(8);
    expect(p.done).toBe(1);
    expect(p.isFullyReady).toBe(false);
  });

  it("reports fully ready at 8/8", () => {
    const p = verificationLayerProgress(mockStatus(8));
    expect(p.done).toBe(8);
    expect(p.percent).toBe(100);
    expect(p.isFullyReady).toBe(true);
  });
});
