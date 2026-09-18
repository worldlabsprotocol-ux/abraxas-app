import { describe, expect, it } from "vitest";
import { buildCustomLaunchpadSandboxPolicy } from "./customPolicy";

const valid = {
  name: "Token transfer eligibility",
  userExplanation: "Confirm the wallet meets this protocol's eligibility requirements.",
  requiredClaimIds: ["identity_verified", "wallet_binding_confirmed"],
  minimumAssurance: "L2" as const,
  receiptLifetimeHours: 24,
};

describe("custom Launchpad sandbox policy", () => {
  it("builds a declarative, sandbox-only policy", () => {
    const result = buildCustomLaunchpadSandboxPolicy(valid);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rules.sandbox_only).toBe(true);
    expect(result.rules.required_claims?.map((claim) => claim.claim_type)).toEqual(valid.requiredClaimIds);
  });

  it("rejects empty, unknown, and overbroad policy inputs", () => {
    expect(buildCustomLaunchpadSandboxPolicy({ ...valid, requiredClaimIds: [] }).ok).toBe(false);
    expect(buildCustomLaunchpadSandboxPolicy({ ...valid, requiredClaimIds: ["arbitrary_code"] }).ok).toBe(false);
    expect(buildCustomLaunchpadSandboxPolicy({ ...valid, receiptLifetimeHours: 169 }).ok).toBe(false);
  });
});
