import { beforeEach, describe, expect, it, vi } from "vitest";
import { publishPolicyDraft } from "@/lib/policy/policyVersioning";
import { PolicyImmutabilityError } from "@/lib/policy/policyLifecycle";

const POLICY_ID = "good-trouble-retail-v1";
const rpcMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    rpc: (...args: unknown[]) => rpcMock(...args),
  }),
}));

describe("publishPolicyDraft service (atomic RPC)", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("calls publish_partner_policy_draft RPC with policy id and target version", async () => {
    rpcMock.mockResolvedValue({
      data: {
        published: {
          id: POLICY_ID,
          partner_id: "good-trouble-cannabis",
          version: 2,
          name: "Good Trouble retail v2",
          rules_json: { minimum_age: 21 },
          status: "active",
        },
        deprecated_version: 1,
      },
      error: null,
    });

    const result = await publishPolicyDraft({ policyId: POLICY_ID, version: 2 });

    expect(rpcMock).toHaveBeenCalledWith("publish_partner_policy_draft", {
      p_policy_id: POLICY_ID,
      p_target_version: 2,
    });
    expect(result.published.status).toBe("active");
    expect(result.deprecatedVersion).toBe(1);
  });

  it("rejects invalid publish when target is not draft (RPC error)", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: {
        message: "publish_partner_policy_draft: only draft versions can be published (good-trouble-retail-v1 v2 is active)",
      },
    });

    await expect(
      publishPolicyDraft({ policyId: POLICY_ID, version: 2 }),
    ).rejects.toBeInstanceOf(PolicyImmutabilityError);
  });

  it("surfaces concurrent publish failure without partial client-side updates", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: {
        message: "publish_partner_policy_draft: failed to activate draft good-trouble-retail-v1 v2 (concurrent publish?)",
      },
    });

    await expect(
      publishPolicyDraft({ policyId: POLICY_ID, version: 2 }),
    ).rejects.toThrow(/concurrent publish/i);
  });

  it("prevents no-active-policy outcome via RPC invariant error", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: {
        message: "publish_partner_policy_draft: invariant violated — expected exactly one active version for good-trouble-retail-v1",
      },
    });

    await expect(
      publishPolicyDraft({ policyId: POLICY_ID, version: 2 }),
    ).rejects.toBeInstanceOf(PolicyImmutabilityError);
  });
});
