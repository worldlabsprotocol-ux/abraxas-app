import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";

const resolvePartnerConsoleSessionMock = vi.fn();
const mockResolveAdminAccess = vi.fn();
const submitMock = vi.fn();
const listPartnerMock = vi.fn();
const listOperatorMock = vi.fn();
const decideMock = vi.fn();

vi.mock("@/lib/partner/launchpad/partnerConsoleSession", () => ({
  resolvePartnerConsoleSession: (...args: unknown[]) => resolvePartnerConsoleSessionMock(...args),
  requirePartnerConsoleSession: async (req: NextRequest) => {
    const session = await resolvePartnerConsoleSessionMock(req);
    if (!session) return { ok: false, error: "Partner console sign in required", status: 401 };
    return { ok: true, session };
  },
}));

vi.mock("@/lib/adminAuth", () => ({
  resolveAdminAccess: (...args: unknown[]) => mockResolveAdminAccess(...args),
}));

vi.mock("@/lib/partner/policyProposal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/partner/policyProposal")>();
  return {
    ...actual,
    submitPolicyProposal: (...args: unknown[]) => submitMock(...args),
    listPartnerProposals: (...args: unknown[]) => listPartnerMock(...args),
    listOperatorProposals: (...args: unknown[]) => listOperatorMock(...args),
    decidePolicyProposal: (...args: unknown[]) => decideMock(...args),
  };
});

import { GET as partnerGet, POST as partnerPost } from "@/app/api/launchpad/policy-proposals/route";
import { GET as adminGet } from "@/app/api/admin/policy-proposals/route";
import { POST as adminDecide } from "@/app/api/admin/policy-proposals/[id]/decide/route";

const body = {
  action: "retail_access",
  result_needed: "age_21",
  partner_receives: ["eligibility_result"],
  stays_private: ["date_of_birth"],
  environment: "sandbox",
  platform: "http_generic",
  capabilities: ["reusable_result"],
  confirm: true,
};

function partnerPostReq(payload: unknown, opts?: { cookie?: boolean; origin?: string }) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts?.cookie !== false) headers.cookie = "abraxas_partner_console_session=test";
  if (opts?.origin !== "") headers.origin = opts?.origin ?? "http://localhost";
  return new NextRequest("http://localhost/api/launchpad/policy-proposals", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

describe("policy proposal routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLaunchpadRateLimitStoreForTests();
    resolvePartnerConsoleSessionMock.mockResolvedValue({ partnerId: "acme" });
    mockResolveAdminAccess.mockResolvedValue({ authorized: true, reason: "allowlisted_email", allowlist_configured: true });
    listPartnerMock.mockResolvedValue({ ok: true, items: [] });
    listOperatorMock.mockResolvedValue({ ok: true, items: [] });
    submitMock.mockResolvedValue({
      ok: true,
      item: {
        proposal_ref: "ppr_abc",
        status: "submitted",
        creates_policy: false,
        publishes_catalog: false,
        activates_mainnet: false,
        executes: false,
      },
    });
    decideMock.mockResolvedValue({
      ok: true,
      replay: false,
      item: { proposal_ref: "ppr_abc", status: "accepted_for_policy_work", planning: { live_policy: false } },
    });
  });

  it("denies unsigned Launchpad and unsigned operator access", async () => {
    resolvePartnerConsoleSessionMock.mockResolvedValue(null);
    const unsigned = await partnerPost(partnerPostReq(body, { cookie: false }));
    expect(unsigned.status).toBe(401);
    expect(submitMock).not.toHaveBeenCalled();

    mockResolveAdminAccess.mockResolvedValue({ authorized: false, reason: "no_session", allowlist_configured: true });
    expect((await adminGet(new NextRequest("http://localhost/api/admin/policy-proposals"))).status).toBe(401);
    mockResolveAdminAccess.mockResolvedValue({ authorized: false, reason: "email_not_allowlisted", allowlist_configured: true });
    expect((await adminGet(new NextRequest("http://localhost/api/admin/policy-proposals"))).status).toBe(403);
    expect(listOperatorMock).not.toHaveBeenCalled();
  });

  it("uses session partner identity and rejects client partner_id or extra fields", async () => {
    const forged = await partnerPost(partnerPostReq({ ...body, partner_id: "other" }));
    expect(forged.status).toBe(400);
    expect((await forged.json() as { error: string }).error).toBe("policy_proposal_client_override_rejected");
    expect(submitMock).not.toHaveBeenCalled();

    const extra = await partnerPost(partnerPostReq({ ...body, receipt: "rct_1", activate_production: true }));
    expect(extra.status).toBe(400);

    const ok = await partnerPost(partnerPostReq(body));
    expect(ok.status).toBe(200);
    expect(submitMock).toHaveBeenCalledWith({
      partnerId: "acme",
      body,
      confirm: true,
    });
  });

  it("requires CSRF on mutating routes and never claims catalog or Mainnet side effects", async () => {
    const missing = await partnerPost(partnerPostReq(body, { origin: "" }));
    expect(missing.status).toBe(403);

    const decided = await adminDecide(
      new NextRequest("http://localhost/api/admin/policy-proposals/prop-1/decide", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost" },
        body: JSON.stringify({ status: "accepted_for_policy_work", confirm: true }),
      }),
      { params: { id: "prop-1" } },
    );
    expect(decided.status).toBe(200);
    const json = await decided.json() as {
      creates_policy: boolean;
      publishes_catalog: boolean;
      activates_mainnet: boolean;
      executes: boolean;
    };
    expect(json.creates_policy).toBe(false);
    expect(json.publishes_catalog).toBe(false);
    expect(json.activates_mainnet).toBe(false);
    expect(json.executes).toBe(false);

    const list = await partnerGet(new NextRequest("http://localhost/api/launchpad/policy-proposals", {
      headers: { cookie: "abraxas_partner_console_session=test" },
    }));
    const listed = await list.json() as { creates_policy: boolean; activates_mainnet: boolean };
    expect(listed.creates_policy).toBe(false);
    expect(listed.activates_mainnet).toBe(false);
    expect(listPartnerMock).toHaveBeenCalledWith("acme");
  });
});
