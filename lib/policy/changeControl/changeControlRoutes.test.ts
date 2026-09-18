import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const sessionMock = vi.fn();
const appMock = vi.fn();
const overviewMock = vi.fn();
const createDraftMock = vi.fn();
const publishMock = vi.fn();
const adoptMock = vi.fn();
const deprecateMock = vi.fn();
const updateDraftMock = vi.fn();
const deleteDraftMock = vi.fn();
const fixturePolicyMock = vi.fn();
const probeMock = vi.fn();
const assertSchemaMock = vi.fn();

vi.mock("@/lib/partner/launchpad/apiHelpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/partner/launchpad/apiHelpers")>(
    "@/lib/partner/launchpad/apiHelpers",
  );
  return {
    ...actual,
    requireLaunchpadSession: (...args: unknown[]) => sessionMock(...args),
    enforceLaunchpadRateLimit: () => null,
  };
});

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({
  getLaunchpadApplicationForPartner: (...args: unknown[]) => appMock(...args),
}));

vi.mock("@/lib/policy/changeControl", async () => {
  const actual = await vi.importActual<typeof import("@/lib/policy/changeControl")>(
    "@/lib/policy/changeControl",
  );
  return {
    ...actual,
    buildPolicyChangeControlOverview: (...args: unknown[]) => overviewMock(...args),
    createPartnerPolicyDraftSuccessor: (...args: unknown[]) => createDraftMock(...args),
    publishPartnerPolicyDraftVersion: (...args: unknown[]) => publishMock(...args),
    adoptPolicyVersionForApplication: (...args: unknown[]) => adoptMock(...args),
    deprecatePartnerPolicyVersion: (...args: unknown[]) => deprecateMock(...args),
    editPartnerPolicyDraft: (...args: unknown[]) => updateDraftMock(...args),
    deletePartnerPolicyDraft: (...args: unknown[]) => deleteDraftMock(...args),
  };
});

vi.mock("@/lib/policy/changeControl/schemaReady", async () => {
  const actual = await vi.importActual<typeof import("@/lib/policy/changeControl/schemaReady")>(
    "@/lib/policy/changeControl/schemaReady",
  );
  return {
    ...actual,
    probePolicyChangeControlSchema: (...args: unknown[]) => probeMock(...args),
    assertPolicyChangeControlSchemaReady: (...args: unknown[]) => assertSchemaMock(...args),
  };
});

vi.mock("@/lib/policy/getPolicy", () => ({
  getPartnerPolicyAtVersion: (...args: unknown[]) => fixturePolicyMock(...args),
  getPartnerPolicy: vi.fn(),
}));

import { GET, POST } from "@/app/api/launchpad/applications/[id]/policies/route";

describe("launchpad policy change control routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.mockResolvedValue({ ok: true, session: { partnerId: "partner-a" } });
    appMock.mockResolvedValue({
      id: "app-1",
      partner_id: "partner-a",
      policy_id: "policy-v1",
      policy_version: 1,
      public_slug: "partner-app",
      display_name: "App",
    });
    probeMock.mockResolvedValue({
      ready: true,
      lifecycle_audit: true,
      adoptions: true,
      deprecate_effective_at: true,
    });
    assertSchemaMock.mockResolvedValue(undefined);
  });

  it("returns the policies overview without PII or secrets", async () => {
    overviewMock.mockResolvedValue({
      policy_id: "policy-v1",
      partner_id: "partner-a",
      active: { version: 1, required_claims: ["identity_verified"], withheld_fields: ["date of birth"] },
      draft: null,
      next_action: "No policy version action required.",
      blocker_code: null,
      applications: [],
      audit: [],
      fixture_label: "Offline / simulated — this does not issue a production receipt.",
      google_sign_in_is_not_eligibility: "Google sign-in creates an Abraxas account.",
    });
    const res = await GET(new NextRequest("http://localhost/api/launchpad/applications/app-1/policies"), {
      params: { id: "app-1" },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.pinned_version).toBe(1);
    expect(JSON.stringify(body)).not.toMatch(/email@|date_of_birth|abx_|oauth|credential_jwt|wallet_secret/);
  });

  it("rejects unauthenticated policy access", async () => {
    sessionMock.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ ok: false, code: "launchpad_unauthorized" }), { status: 401 }),
    });
    const res = await GET(new NextRequest("http://localhost/api/launchpad/applications/app-1/policies"), {
      params: { id: "app-1" },
    });
    expect(res.status).toBe(401);
  });

  it("creates a draft successor for the owning partner", async () => {
    createDraftMock.mockResolvedValue({ id: "policy-v1", version: 2, status: "draft", partner_id: "partner-a" });
    const res = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/policies", {
      method: "POST",
      body: JSON.stringify({ action: "create_draft" }),
    }), { params: { id: "app-1" } });
    expect(res.status).toBe(200);
    expect(createDraftMock).toHaveBeenCalledWith(expect.objectContaining({
      policyId: "policy-v1",
      partnerId: "partner-a",
    }));
  });

  it("publishes only after the service layer is invoked for the draft version", async () => {
    publishMock.mockResolvedValue({
      published: { id: "policy-v1", version: 2, status: "active" },
      deprecatedVersion: 1,
    });
    const res = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/policies", {
      method: "POST",
      body: JSON.stringify({ action: "publish", version: 2 }),
    }), { params: { id: "app-1" } });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.notice).toMatch(/pinned version/i);
  });

  it("records explicit adoption", async () => {
    adoptMock.mockResolvedValue({
      application: { id: "app-1", policy_version: 2 },
      from_version: 1,
      to_version: 2,
      idempotent_replay: false,
    });
    const res = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/policies", {
      method: "POST",
      body: JSON.stringify({ action: "adopt", version: 2 }),
    }), { params: { id: "app-1" } });
    const body = await res.json();
    expect(body.to_version).toBe(2);
    expect(body.idempotent_replay).toBe(false);
  });

  it("returns fixture results labeled simulated and without PII", async () => {
    fixturePolicyMock.mockResolvedValue({
      id: "policy-v1",
      partner_id: "partner-a",
      version: 2,
      name: "Draft",
      status: "draft",
      rules_json: { required_claims: [{ claim_type: "identity_verified", min_assurance: "L2" }] },
    });
    const res = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/policies", {
      method: "POST",
      body: JSON.stringify({
        action: "fixture",
        version: 2,
        fixture_claims: [{ claim_type: "identity_verified", present: true }],
      }),
    }), { params: { id: "app-1" } });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.simulated).toBe(true);
    expect(body.classification).toBe("offline_simulated");
    expect(body.issues_receipt).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/email@|date_of_birth|abx_|credential_jwt|wallet_secret/);
  });

  it("rejects fixture bodies that include PII keys", async () => {
    const res = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/policies", {
      method: "POST",
      body: JSON.stringify({
        action: "fixture",
        version: 2,
        email: "holder@example.com",
      }),
    }), { params: { id: "app-1" } });
    expect(res.status).toBe(400);
  });

  it("returns a typed feature-unavailable result when the schema is missing", async () => {
    probeMock.mockResolvedValue({
      ready: false,
      lifecycle_audit: false,
      adoptions: true,
      deprecate_effective_at: true,
    });
    const res = await GET(new NextRequest("http://localhost/api/launchpad/applications/app-1/policies"), {
      params: { id: "app-1" },
    });
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      code: "policy_schema_unavailable",
      available: false,
      feature: "policy_change_control",
      application_id: "app-1",
      pinned_version: 1,
    });
    expect(overviewMock).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toMatch(/42P01|PGRST|does not exist/);
  });

  it("fails every policy mutation before any draft or adoption write when schema is unavailable", async () => {
    const { PolicyChangeControlError } = await import("@/lib/policy/changeControl/codes");
    assertSchemaMock.mockRejectedValue(new PolicyChangeControlError("policy_schema_unavailable"));
    const actions = [
      { action: "create_draft" },
      { action: "update_draft", version: 2 },
      { action: "publish", version: 2 },
      { action: "deprecate", version: 1 },
      { action: "adopt", version: 2 },
      { action: "delete_draft", version: 2 },
    ];
    for (const body of actions) {
      vi.clearAllMocks();
      sessionMock.mockResolvedValue({ ok: true, session: { partnerId: "partner-a" } });
      appMock.mockResolvedValue({
        id: "app-1",
        partner_id: "partner-a",
        policy_id: "policy-v1",
        policy_version: 1,
      });
      assertSchemaMock.mockRejectedValue(new PolicyChangeControlError("policy_schema_unavailable"));
      const res = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/policies", {
        method: "POST",
        body: JSON.stringify(body),
      }), { params: { id: "app-1" } });
      const json = await res.json();
      expect(res.status).toBe(503);
      expect(json.code).toBe("policy_schema_unavailable");
      expect(json.ok).toBe(false);
      expect(json.available).toBe(false);
      expect(createDraftMock).not.toHaveBeenCalled();
      expect(updateDraftMock).not.toHaveBeenCalled();
      expect(publishMock).not.toHaveBeenCalled();
      expect(deprecateMock).not.toHaveBeenCalled();
      expect(adoptMock).not.toHaveBeenCalled();
      expect(deleteDraftMock).not.toHaveBeenCalled();
      expect(JSON.stringify(json)).not.toMatch(/42P01|PGRST|does not exist/);
    }
  });
});
