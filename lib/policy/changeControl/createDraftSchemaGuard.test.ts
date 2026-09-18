import { beforeEach, describe, expect, it, vi } from "vitest";

const assertReady = vi.fn();
const createDraftFromActive = vi.fn();
const appendAudit = vi.fn();
const getPartnerPolicy = vi.fn();
const deleteResult = { error: null as { message?: string } | null };

vi.mock("@/lib/policy/changeControl/schemaReady", async () => {
  const actual = await vi.importActual<typeof import("@/lib/policy/changeControl/schemaReady")>(
    "@/lib/policy/changeControl/schemaReady",
  );
  return {
    ...actual,
    assertPolicyChangeControlSchemaReady: (...args: unknown[]) => assertReady(...args),
  };
});

vi.mock("@/lib/policy/policyVersioning", () => ({
  createPolicyDraftFromActive: (...args: unknown[]) => createDraftFromActive(...args),
  deprecatePolicyVersion: vi.fn(),
  listPolicyVersions: vi.fn(),
  publishPolicyDraft: vi.fn(),
  updatePolicyDraft: vi.fn(),
}));

vi.mock("@/lib/policy/changeControl/audit", () => ({
  appendPolicyLifecycleAudit: (...args: unknown[]) => appendAudit(...args),
  listPolicyLifecycleAudit: vi.fn(),
  sanitizePolicyAuditMetadata: (metadata: Record<string, unknown>) => metadata,
}));

vi.mock("@/lib/policy/getPolicy", () => ({
  getPartnerPolicy: (...args: unknown[]) => getPartnerPolicy(...args),
  getPartnerPolicyAtVersion: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: () => {
      const chain: Record<string, unknown> = {};
      chain.delete = () => chain;
      chain.eq = () => chain;
      chain.then = (
        resolve: (value: unknown) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => Promise.resolve(deleteResult).then(resolve, reject);
      return chain;
    },
  }),
}));

import { createPartnerPolicyDraftSuccessor } from "@/lib/policy/changeControl/lifecycle";
import { PolicyChangeControlError } from "@/lib/policy/changeControl/codes";

describe("createPartnerPolicyDraftSuccessor schema guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteResult.error = null;
    assertReady.mockResolvedValue(undefined);
    getPartnerPolicy.mockResolvedValue({
      id: "policy-v1",
      partner_id: "partner-a",
      version: 1,
      status: "active",
    });
    createDraftFromActive.mockResolvedValue({
      id: "policy-v1",
      partner_id: "partner-a",
      version: 2,
      status: "draft",
    });
    appendAudit.mockResolvedValue(undefined);
  });

  it("does not insert a draft when the schema is unavailable", async () => {
    assertReady.mockRejectedValue(new PolicyChangeControlError("policy_schema_unavailable"));
    await expect(createPartnerPolicyDraftSuccessor({
      policyId: "policy-v1",
      partnerId: "partner-a",
    })).rejects.toMatchObject({ code: "policy_schema_unavailable" });
    expect(createDraftFromActive).not.toHaveBeenCalled();
    expect(appendAudit).not.toHaveBeenCalled();
  });

  it("compensates a leftover draft when audit fails after the insert", async () => {
    appendAudit.mockRejectedValue(new Error("policy_lifecycle_audit_failed"));
    await expect(createPartnerPolicyDraftSuccessor({
      policyId: "policy-v1",
      partnerId: "partner-a",
    })).rejects.toMatchObject({
      code: "policy_schema_unavailable",
      evidence: {
        draft_created: true,
        audit_written: false,
        compensated: true,
        draft_persisted: false,
        version: 2,
      },
    });
    expect(createDraftFromActive).toHaveBeenCalledTimes(1);
  });

  it("returns typed evidence when draft compensation cannot delete the row", async () => {
    appendAudit.mockRejectedValue(new Error("policy_lifecycle_audit_failed"));
    deleteResult.error = { message: "delete blocked" };
    try {
      await createPartnerPolicyDraftSuccessor({
        policyId: "policy-v1",
        partnerId: "partner-a",
      });
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(PolicyChangeControlError);
      expect(error).toMatchObject({
        code: "policy_schema_unavailable",
        evidence: {
          draft_created: true,
          audit_written: false,
          compensated: false,
          draft_persisted: true,
          version: 2,
        },
      });
      expect(JSON.stringify(error)).not.toMatch(/42P01|PGRST|delete blocked|does not exist/);
    }
  });
});
