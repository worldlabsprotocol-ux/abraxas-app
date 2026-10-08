import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";

const getPartnerPolicyAtVersionMock = vi.fn();
const assertSchemaReadyMock = vi.fn();
const appendAuditMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/policy/getPolicy", () => ({
  getPartnerPolicyAtVersion: (...args: unknown[]) => getPartnerPolicyAtVersionMock(...args),
}));

vi.mock("@/lib/policy/changeControl/schemaReady", () => ({
  assertPolicyChangeControlSchemaReady: (...args: unknown[]) => assertSchemaReadyMock(...args),
  isPolicySchemaMissingError: (error: unknown) => {
    const message = error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message ?? "")
      : "";
    return message.includes("does not exist");
  },
}));

vi.mock("@/lib/policy/changeControl/audit", () => ({
  appendPolicyLifecycleAudit: (...args: unknown[]) => appendAuditMock(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: fromMock,
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

function chain(updateResult: { data: unknown; error: unknown }) {
  const builder = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(updateResult),
    insert: vi.fn().mockResolvedValue({ error: null }),
  };
  return builder;
}

describe("adoptPolicyVersionForApplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertSchemaReadyMock.mockResolvedValue(undefined);
    appendAuditMock.mockResolvedValue(undefined);
    getPartnerPolicyAtVersionMock.mockResolvedValue(ACTIVE_V2);
  });

  it("returns idempotent replay when already pinned to target version", async () => {
    const result = await adoptPolicyVersionForApplication({
      application: { ...APP, policy_version: 2 },
      toVersion: 2,
      actorId: "good-trouble",
    });
    expect(result.idempotent_replay).toBe(true);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("adopts v2 atomically with audit and primary binding sync", async () => {
    const appUpdate = chain({
      data: { ...APP, policy_version: 2 },
      error: null,
    });
    const bindingUpdate = chain({ data: null, error: null });
    const adoptionInsert = chain({ data: null, error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === "partner_launchpad_applications") return appUpdate;
      if (table === "partner_launchpad_application_policies") return bindingUpdate;
      if (table === "partner_policy_adoptions") return adoptionInsert;
      throw new Error(`unexpected table ${table}`);
    });

    const result = await adoptPolicyVersionForApplication({
      application: APP,
      toVersion: 2,
      actorId: "good-trouble",
    });

    expect(result.from_version).toBe(1);
    expect(result.to_version).toBe(2);
    expect(result.application.policy_version).toBe(2);
    expect(appUpdate.eq).toHaveBeenCalledWith("policy_version", 1);
    expect(bindingUpdate.eq).toHaveBeenCalledWith("binding_role", "primary");
    expect(adoptionInsert.insert).toHaveBeenCalledWith(expect.objectContaining({
      application_id: APP.id,
      from_version: 1,
      to_version: 2,
      actor_id: "good-trouble",
    }));
    expect(appendAuditMock).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "adopted",
      fromVersion: 1,
      toVersion: 2,
    }));
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
  });

  it("fails closed on concurrent pin change", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "partner_launchpad_applications") {
        return chain({ data: null, error: null });
      }
      throw new Error(`unexpected table ${table}`);
    });

    await expect(adoptPolicyVersionForApplication({
      application: APP,
      toVersion: 2,
      actorId: "good-trouble",
    })).rejects.toMatchObject({ code: "policy_version_mismatched" });
  });
});
