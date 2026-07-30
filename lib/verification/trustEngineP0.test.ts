import { describe, expect, it, vi, beforeEach } from "vitest";
import { assertPolicyBelongsToPartner, PolicyOwnershipError } from "@/lib/policy/assertPolicyOwnership";
import type { PartnerPolicy } from "@/lib/policy/types";
import { getDecisionStatusForPartner } from "@/lib/verification/decisionAccess";

const basePolicy = (overrides: Partial<PartnerPolicy> = {}): PartnerPolicy => ({
  id: "good-trouble-retail-v1",
  partner_id: "good-trouble-cannabis",
  version: 1,
  name: "GT retail",
  rules_json: { required_claims: [{ claim_type: "identity_verified" }] },
  status: "active",
  ...overrides,
});

describe("P0-API-1 / P0-CNS-3: policy ownership", () => {
  it("rejects policy belonging to another partner", () => {
    const policy = basePolicy({ partner_id: "other-partner" });
    expect(() => assertPolicyBelongsToPartner(policy, "good-trouble-cannabis"))
      .toThrow(PolicyOwnershipError);
  });

  it("allows policy owned by requesting partner", () => {
    const policy = basePolicy();
    expect(() => assertPolicyBelongsToPartner(policy, "good-trouble-cannabis")).not.toThrow();
  });
});

vi.mock("@/lib/verification/requestsService", () => ({
  getDecisionStatus: vi.fn(),
}));

describe("P0-API-1: decision access scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when decision belongs to another partner", async () => {
    const { getDecisionStatus } = await import("@/lib/verification/requestsService");
    vi.mocked(getDecisionStatus).mockResolvedValue({
      id: "vd_1",
      request_id: null,
      partner_id: "other-partner",
      subject_id: "0xabc",
      policy_id: "pol",
      policy_version: 1,
      decision: "approved",
      claims_json: {},
      reason_codes: [],
      valid_until: null,
      decided_at: new Date().toISOString(),
      status: "active",
    });

    const result = await getDecisionStatusForPartner("vd_1", "good-trouble-cannabis");
    expect(result).toBeNull();
  });

  it("returns decision when partner matches", async () => {
    const { getDecisionStatus } = await import("@/lib/verification/requestsService");
    const row = {
      id: "vd_1",
      request_id: null,
      partner_id: "good-trouble-cannabis",
      subject_id: "0xabc",
      policy_id: "pol",
      policy_version: 1,
      decision: "approved" as const,
      claims_json: {},
      reason_codes: [],
      valid_until: null,
      decided_at: new Date().toISOString(),
      status: "active",
    };
    vi.mocked(getDecisionStatus).mockResolvedValue(row);

    const result = await getDecisionStatusForPartner("vd_1", "good-trouble-cannabis");
    expect(result).toEqual(row);
  });
});
