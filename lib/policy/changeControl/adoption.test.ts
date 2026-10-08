import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";

const getPartnerPolicyAtVersionMock = vi.fn();
const assertSchemaReadyMock = vi.fn();
const rpcMock = vi.fn();

vi.mock("@/lib/policy/getPolicy", () => ({
  getPartnerPolicyAtVersion: (...args: unknown[]) => getPartnerPolicyAtVersionMock(...args),
}));

vi.mock("@/lib/policy/changeControl/schemaReady", () => ({
  assertPolicyChangeControlSchemaReady: (...args: unknown[]) => assertSchemaReadyMock(...args),
  isPolicySchemaMissingError: (error: unknown) => {
    const message = error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message ?? "")
      : "";
    return message.includes("does not exist") || message.includes("PGRST202");
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    rpc: rpcMock,
  }),
}));

import { adoptPolicyVersionForApplication } from "@/lib/policy/changeControl/adoption";
import { PolicyChangeControlError } from "@/lib/policy/changeControl/codes";

const APP: LaunchpadApplicationRow = {
  id: "690d0c89-7b98-4946-8ad2-7469f5ca89d9",
  partner_id: "good-trouble",
  public_slug: "good-trouble",
  display_name: "Good Trouble",
  policy_id: "good-trouble-age_21_retail-v1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  environment: "sandbox",
  status: "active",
  allowed_return_urls: ["https://www.goodtroublecanna.com/age-verification-result"],
  api_key_id: "key-1",
  production_api_key_id: null,
  production_activated_at: null,
  created_at: "2026-09-30T17:09:40.508Z",
  updated_at: "2026-09-30T17:09:40.508Z",
};

const ACTIVE_V2 = {
  id: APP.policy_id,
  partner_id: APP.partner_id,
  version: 2,
  name: "Good Trouble policy",
  status: "active",
  effective_at: "2026-10-02T05:47:54.952Z",
  rules_json: {
    age_eligibility_only: true,
    minimum_assurance_cap: "L0",
    required_claims: [{ claim_type: "self_attested_age_band", must_equal: "over_21" }],
  },
};

describe("adoptPolicyVersionForApplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertSchemaReadyMock.mockResolvedValue(undefined);
    getPartnerPolicyAtVersionMock.mockResolvedValue(ACTIVE_V2);
  });

  it("returns idempotent replay when already pinned to target version", async () => {
    const result = await adoptPolicyVersionForApplication({
      application: { ...APP, policy_version: 2 },
      toVersion: 2,
      actorId: "good-trouble",
    });
    expect(result.idempotent_replay).toBe(true);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("adopts v2 through the atomic RPC", async () => {
    rpcMock.mockResolvedValue({
      data: {
        ok: true,
        code: "adopted",
        application: { ...APP, policy_version: 2 },
        from_version: 1,
        to_version: 2,
        idempotent_replay: false,
      },
      error: null,
    });

    const result = await adoptPolicyVersionForApplication({
      application: APP,
      toVersion: 2,
      actorId: "good-trouble",
    });

    expect(result.from_version).toBe(1);
    expect(result.to_version).toBe(2);
    expect(result.application.policy_version).toBe(2);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("partner_policy_adopt_version_atomic", {
      p_application_id: APP.id,
      p_partner_id: APP.partner_id,
      p_policy_id: APP.policy_id,
      p_from_version: 1,
      p_to_version: 2,
      p_actor_id: "good-trouble",
    });
  });

  it("rejects adoption when target version fails issuance gate", async () => {
    getPartnerPolicyAtVersionMock.mockResolvedValue({
      ...ACTIVE_V2,
      status: "draft",
    });

    await expect(adoptPolicyVersionForApplication({
      application: APP,
      toVersion: 2,
      actorId: "good-trouble",
    })).rejects.toBeInstanceOf(PolicyChangeControlError);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("propagates RPC failure without returning a successful adoption", async () => {
    rpcMock.mockResolvedValue({
      data: { ok: false, code: "adoption_write_failed" },
      error: null,
    });

    await expect(adoptPolicyVersionForApplication({
      application: APP,
      toVersion: 2,
      actorId: "good-trouble",
    })).rejects.toThrow("policy_adoption_write_failed");
  });

  it("maps concurrent pin change to policy_version_mismatched", async () => {
    rpcMock.mockResolvedValue({
      data: { ok: false, code: "policy_version_mismatched" },
      error: null,
    });

    await expect(adoptPolicyVersionForApplication({
      application: APP,
      toVersion: 2,
      actorId: "good-trouble",
    })).rejects.toMatchObject({ code: "policy_version_mismatched" });
  });

  it("does not call RPC when schema preflight fails", async () => {
    assertSchemaReadyMock.mockRejectedValue(new PolicyChangeControlError("policy_schema_unavailable"));

    await expect(adoptPolicyVersionForApplication({
      application: APP,
      toVersion: 2,
      actorId: "good-trouble",
    })).rejects.toMatchObject({ code: "policy_schema_unavailable" });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("treats duplicate RPC replay as idempotent success", async () => {
    rpcMock.mockResolvedValue({
      data: {
        ok: true,
        code: "idempotent_replay",
        application: { ...APP, policy_version: 2 },
        from_version: 2,
        to_version: 2,
        idempotent_replay: true,
      },
      error: null,
    });

    const result = await adoptPolicyVersionForApplication({
      application: APP,
      toVersion: 2,
      actorId: "good-trouble",
    });

    expect(result.idempotent_replay).toBe(true);
    expect(result.application.policy_version).toBe(2);
  });
});
