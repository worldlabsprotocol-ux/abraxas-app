// FILE: lib/securityOperations/operationalGapAudit.test.ts

import { describe, expect, it } from "vitest";
import { auditOperationalSecurityCapabilities } from "./operationalGapAudit";

describe("operationalGapAudit", () => {
  it("includes Build 870 freshness and external RP enforcement drills", () => {
    const caps = auditOperationalSecurityCapabilities();
    expect(caps.some((c) => c.id === "issuer_freshness_non_authorizing")).toBe(true);
    expect(caps.some((c) => c.id === "external_rp_mandatory_deny")).toBe(true);
  });

  it("labels every capability with an evidence tier (simulated vs deployed vs operator)", () => {
    const caps = auditOperationalSecurityCapabilities();
    for (const cap of caps) {
      expect(["simulated_ci", "deployed_demo", "requires_operator"]).toContain(cap.evidenceTier);
    }
    expect(caps.every((c) => c.evidenceTier !== "deployed_demo")).toBe(true);
    expect(caps.filter((c) => c.evidenceTier === "requires_operator").length).toBeGreaterThan(0);
  });
});
