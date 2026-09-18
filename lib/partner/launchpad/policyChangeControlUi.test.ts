import { describe, expect, it, vi, beforeEach } from "vitest";

const probeMock = vi.fn();

vi.mock("@/lib/policy/changeControl/schemaReady", async () => {
  const actual = await vi.importActual<typeof import("@/lib/policy/changeControl/schemaReady")>(
    "@/lib/policy/changeControl/schemaReady",
  );
  return {
    ...actual,
    probePolicyChangeControlSchema: (...args: unknown[]) => probeMock(...args),
  };
});

import { resolvePolicyChangeControlUiAvailability } from "@/lib/partner/launchpad/policyChangeControlAvailability";
import {
  launchpadHealthChecksForUi,
  shouldRenderPolicyChangeControlUi,
  withPolicyChangeControlUiFlag,
} from "@/lib/partner/launchpad/policyChangeControlUi";

describe("Launchpad Policy Change Control dark-launch gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides the Policies UI for Production-style missing schema", async () => {
    probeMock.mockResolvedValue({
      ready: false,
      lifecycle_audit: false,
      adoptions: false,
      deprecate_effective_at: false,
    });
    const available = await resolvePolicyChangeControlUiAvailability();
    expect(available).toBe(false);
    expect(shouldRenderPolicyChangeControlUi(available)).toBe(false);
    expect(shouldRenderPolicyChangeControlUi(false)).toBe(false);
    expect(shouldRenderPolicyChangeControlUi(undefined)).toBe(false);

    const workspace = withPolicyChangeControlUiFlag({ partner_id: "acme", applications: [] }, false);
    expect(workspace.policy_change_control_available).toBe(false);
    expect(launchpadHealthChecksForUi(
      [{ id: "policy" }, { id: "policy_change_control" }, { id: "production" }],
      false,
    ).map((check) => check.id)).toEqual(["policy", "production"]);
  });

  it("shows the Policies UI for DEMO-style present schema", async () => {
    probeMock.mockResolvedValue({
      ready: true,
      lifecycle_audit: true,
      adoptions: true,
      deprecate_effective_at: true,
    });
    const available = await resolvePolicyChangeControlUiAvailability();
    expect(available).toBe(true);
    expect(shouldRenderPolicyChangeControlUi(available)).toBe(true);

    const workspace = withPolicyChangeControlUiFlag({ partner_id: "demo", applications: [] }, true);
    expect(workspace.policy_change_control_available).toBe(true);
    expect(launchpadHealthChecksForUi(
      [{ id: "policy_change_control" }, { id: "production" }],
      true,
    ).map((check) => check.id)).toEqual(["policy_change_control", "production"]);
  });
});
