import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";

const mockResolveAdminAccess = vi.fn();
const createMock = vi.fn();
const listMock = vi.fn();
const decideMock = vi.fn();

vi.mock("@/lib/adminAuth", () => ({
  resolveAdminAccess: (...args: unknown[]) => mockResolveAdminAccess(...args),
}));

vi.mock("@/lib/partner/policyReleaseCandidate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/partner/policyReleaseCandidate")>();
  return {
    ...actual,
    createReleaseCandidate: (...args: unknown[]) => createMock(...args),
    listReleaseCandidates: (...args: unknown[]) => listMock(...args),
    decideReleaseCandidate: (...args: unknown[]) => decideMock(...args),
  };
});

import { POST as createPost } from "@/app/api/admin/policy-proposals/[id]/release-candidates/route";
import { GET as listGet } from "@/app/api/admin/policy-release-candidates/route";
import { POST as decidePost } from "@/app/api/admin/policy-release-candidates/[id]/decide/route";

const body = {
  confirm: true,
  action: "retail_access",
  result_category: "age_21",
  shared_result: ["eligibility_result"],
  withheld: ["date_of_birth"],
  method_category: "reuse_existing_proof",
  minimum_assurance: "L1",
  environment: "sandbox",
  action_scopes: ["sandbox:protocol_access"],
  disclosure_profile: "result_only",
  compatibility_impact: "policy_review",
  policy_label: "reviewed_gate_age_21",
};

describe("policy release candidate routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLaunchpadRateLimitStoreForTests();
    mockResolveAdminAccess.mockResolvedValue({ authorized: true, reason: "allowlisted_email", allowlist_configured: true });
    listMock.mockResolvedValue({ ok: true, items: [] });
    createMock.mockResolvedValue({
      ok: true,
      item: { candidate_ref: "prc_abc", creates_policy: false, publishes_catalog: false },
    });
    decideMock.mockResolvedValue({
      ok: true,
      replay: false,
      item: { status: "approved_for_catalog_pr" },
    });
  });

  it("denies unsigned and non-operator access", async () => {
    mockResolveAdminAccess.mockResolvedValue({ authorized: false, reason: "no_session", allowlist_configured: true });
    expect((await listGet(new NextRequest("http://localhost/api/admin/policy-release-candidates"))).status).toBe(401);
    mockResolveAdminAccess.mockResolvedValue({ authorized: false, reason: "email_not_allowlisted", allowlist_configured: true });
    expect((await listGet(new NextRequest("http://localhost/api/admin/policy-release-candidates"))).status).toBe(403);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("requires CSRF and rejects client authority fields", async () => {
    const missing = await createPost(
      new NextRequest("http://localhost/api/admin/policy-proposals/prop-1/release-candidates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
      { params: { id: "prop-1" } },
    );
    expect(missing.status).toBe(403);

    const forged = await createPost(
      new NextRequest("http://localhost/api/admin/policy-proposals/prop-1/release-candidates", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost" },
        body: JSON.stringify({ ...body, partner_id: "other", policy_version: 9, activate_production: true }),
      }),
      { params: { id: "prop-1" } },
    );
    expect(forged.status).toBe(400);
    expect((await forged.json() as { error: string }).error).toBe("policy_release_candidate_client_override_rejected");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates and decides without claiming catalog, receipt, or Mainnet side effects", async () => {
    const created = await createPost(
      new NextRequest("http://localhost/api/admin/policy-proposals/prop-1/release-candidates", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost" },
        body: JSON.stringify(body),
      }),
      { params: { id: "prop-1" } },
    );
    expect(created.status).toBe(200);
    const createdJson = await created.json() as { creates_policy: boolean; publishes_catalog: boolean; mints_receipt: boolean };
    expect(createdJson.creates_policy).toBe(false);
    expect(createdJson.publishes_catalog).toBe(false);
    expect(createdJson.mints_receipt).toBe(false);

    const decided = await decidePost(
      new NextRequest("http://localhost/api/admin/policy-release-candidates/rc-1/decide", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost" },
        body: JSON.stringify({ status: "approved_for_catalog_pr", confirm: true }),
      }),
      { params: { id: "rc-1" } },
    );
    expect(decided.status).toBe(200);
    const json = await decided.json() as { activates_mainnet: boolean; executes: boolean };
    expect(json.activates_mainnet).toBe(false);
    expect(json.executes).toBe(false);
  });
});
