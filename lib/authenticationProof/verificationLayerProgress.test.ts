import { describe, expect, it } from "vitest";
import { verificationLayerProgress } from "./verificationLayerProgress";
import type { VerificationLayerStatus } from "./verificationLayerStatus";

function mockStatus(liveCount: number): VerificationLayerStatus {
  const ids = [
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
  it("tracks seven items", () => {
    const p = verificationLayerProgress(mockStatus(1));
    expect(p.total).toBe(7);
    expect(p.done).toBe(1);
    expect(p.isFullyReady).toBe(false);
  });

  it("reports fully ready at 7/7", () => {
    const p = verificationLayerProgress(mockStatus(7));
    expect(p.done).toBe(7);
    expect(p.percent).toBe(100);
    expect(p.isFullyReady).toBe(true);
  });
});
