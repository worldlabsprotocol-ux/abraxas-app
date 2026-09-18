import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const sessionMock = vi.fn();
const appMock = vi.fn();
const overviewMock = vi.fn();
const createDraftMock = vi.fn();
const publishMock = vi.fn();
const adoptMock = vi.fn();
const fixturePolicyMock = vi.fn();

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
});
