import { describe, expect, it } from "vitest";
import {
  buildVerificationTiers,
  loadAuthorizedLocalReference,
} from "./localReference";

describe("token2022 local reference artifact", () => {
  it("loads authorized journey with partner evidence", () => {
    const ref = loadAuthorizedLocalReference();
    expect(ref.build).toBe("981");
    expect(ref.environment).toContain("program");
    expect(ref.has_partner_evidence).toBe(true);
    expect(ref.stages.length).toBeGreaterThan(3);
  });

  it("never labels structural tier as authenticated chain proof", () => {
    const ref = loadAuthorizedLocalReference();
    const tiers = buildVerificationTiers(ref);
    expect(tiers.authenticated_chain.status).toBe("not_performed");
    expect(tiers.structural_semantic.tier).toBe("offline_snapshots");
    expect(tiers.execution_report.tier).toBe("untrusted_recorded_claims");
  });
});