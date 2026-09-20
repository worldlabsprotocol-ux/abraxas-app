import { describe, expect, it, vi, beforeEach } from "vitest";
import { createVerificationRequest } from "@/lib/verification/requestsService";
import { PolicyOwnershipError } from "@/lib/policy/assertPolicyOwnership";

vi.mock("@/lib/policy/getPolicy", () => ({
  getPartnerPolicy: vi.fn(),
  getPartnerPolicyAtVersion: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({ data: { id: "req_1" }, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: vi.fn(),
}));

describe("P0-CNS-3: createVerificationRequest tenancy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects policy not owned by partner", async () => {
    const { getPartnerPolicy } = await import("@/lib/policy/getPolicy");
    vi.mocked(getPartnerPolicy).mockResolvedValue({
      id: "other-policy",
      partner_id: "other-partner",
      version: 1,
      name: "Other",
      rules_json: {},
      status: "active",
    });

    await expect(createVerificationRequest({
      partnerId: "good-trouble-cannabis",
      policyId: "other-policy",
    })).rejects.toThrow(PolicyOwnershipError);
  });

  it("creates request when policy belongs to partner", async () => {
    const { getPartnerPolicy } = await import("@/lib/policy/getPolicy");
    vi.mocked(getPartnerPolicy).mockResolvedValue({
      id: "good-trouble-retail-v1",
      partner_id: "good-trouble-cannabis",
      version: 1,
      name: "GT",
      rules_json: { required_claims: [] },
      status: "active",
    });

    const result = await createVerificationRequest({
      partnerId: "good-trouble-cannabis",
      policyId: "good-trouble-retail-v1",
      returnUrl: "https://evil.example/callback?email=holder@example.com",
    });

    expect(result.request_id).toBe("req_1");
    expect(result.consent_url).toContain("verify_request=req_1");
    expect(result.consent_url).not.toContain("return");
    expect(result.consent_url).not.toContain("partner_id");
    expect(result.consent_url).not.toContain("policy_id");
    expect(result.consent_url).not.toContain("evil.example");
    expect(result.consent_url).not.toContain("@");
  });

  it("fails closed when the target policy version is still draft", async () => {
    const { getPartnerPolicy } = await import("@/lib/policy/getPolicy");
    vi.mocked(getPartnerPolicy).mockResolvedValue({
      id: "good-trouble-retail-v1",
      partner_id: "good-trouble-cannabis",
      version: 2,
      name: "GT draft",
      rules_json: { required_claims: [{ claim_type: "identity_verified" }] },
      status: "draft",
    });

    await expect(createVerificationRequest({
      partnerId: "good-trouble-cannabis",
      policyId: "good-trouble-retail-v1",
    })).rejects.toMatchObject({ code: "policy_version_draft" });
  });
});
