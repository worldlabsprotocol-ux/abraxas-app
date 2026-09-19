import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";
import { CIRCLE_PUBLIC_CODES } from "@/lib/settlement/circle/codes";

const resolvePartnerConsoleSessionMock = vi.fn();
const getAppMock = vi.fn();
const loadViewMock = vi.fn();
const runMock = vi.fn();
const submitMock = vi.fn();

vi.mock("@/lib/partner/launchpad/partnerConsoleSession", () => ({
  resolvePartnerConsoleSession: (...args: unknown[]) => resolvePartnerConsoleSessionMock(...args),
  requirePartnerConsoleSession: async (req: NextRequest) => {
    const session = await resolvePartnerConsoleSessionMock(req);
    if (!session) return { ok: false, error: "Partner console sign in required", status: 401 };
    return { ok: true, session };
  },
}));

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({
  getLaunchpadApplicationForPartner: (...args: unknown[]) => getAppMock(...args),
}));

vi.mock("@/lib/settlement/circle/execute", () => ({
  loadCircleSettlementView: (...args: unknown[]) => loadViewMock(...args),
  runCircleSettlement: (...args: unknown[]) => runMock(...args),
  submitCircleSettlementIntent: (...args: unknown[]) => submitMock(...args),
}));

describe("Circle settlement routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLaunchpadRateLimitStoreForTests();
    resolvePartnerConsoleSessionMock.mockResolvedValue({
      partnerId: "acme",
      apiKeyId: "key-1",
      environment: "sandbox",
    });
    getAppMock.mockResolvedValue({
      id: "app-1",
      partner_id: "acme",
      policy_id: "p1",
      policy_version: 1,
    });
  });

  it("GET returns Preview-safe unavailable without activating production", async () => {
    loadViewMock.mockResolvedValue({
      ok: true,
      available: false,
      code: CIRCLE_PUBLIC_CODES.unavailable,
      activates_production: false,
      not_a_custodian: true,
      intent_is_not_a_payment: true,
      evidence: null,
      intents: [],
      availability: { available: false, code: CIRCLE_PUBLIC_CODES.unavailable },
    });
    const { GET } = await import("@/app/api/launchpad/applications/[id]/settlement/route");
    const res = await GET(new NextRequest("http://localhost/api/launchpad/applications/app-1/settlement"), {
      params: { id: "app-1" },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.available).toBe(false);
    expect(body.activates_production).toBe(false);
    expect(body.code).toBe("circle_unavailable");
  });

  it("POST rejects client transaction hashes", async () => {
    runMock.mockResolvedValue({
      ok: false,
      available: false,
      code: CIRCLE_PUBLIC_CODES.client_hash_rejected,
      activates_production: false,
      evidence: null,
    });
    const { POST } = await import("@/app/api/launchpad/applications/[id]/settlement/route");
    const res = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/settlement", {
      method: "POST",
      body: JSON.stringify({
        receipt_id: "r1",
        idempotency_key: "k1",
        transaction_hash: "0xabc",
      }),
    }), { params: { id: "app-1" } });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.code).toBe("settlement_client_hash_rejected");
  });

  it("POST returns 409 for a duplicate settled intent", async () => {
    runMock.mockResolvedValue({
      ok: true,
      available: true,
      code: CIRCLE_PUBLIC_CODES.duplicate,
      activates_production: false,
      duplicate: true,
      evidence: { state: "settled", amount_minor: 10_000 },
    });
    const { POST } = await import("@/app/api/launchpad/applications/[id]/settlement/route");
    const res = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/settlement", {
      method: "POST",
      body: JSON.stringify({ receipt_id: "r1", idempotency_key: "k1" }),
    }), { params: { id: "app-1" } });
    expect(res.status).toBe(409);
    expect(runMock).toHaveBeenCalledWith(expect.objectContaining({
      receiptId: "r1",
    }));
    expect(runMock.mock.calls[0][0].idempotencyKey).toBeUndefined();
  });

  it("submit POST rejects wallet overrides and duplicate submits", async () => {
    submitMock.mockResolvedValueOnce({
      ok: false,
      code: CIRCLE_PUBLIC_CODES.client_hash_rejected,
      activates_production: false,
    });
    const { POST } = await import("@/app/api/launchpad/applications/[id]/settlement/submit/route");
    const rejected = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/settlement/submit", {
      method: "POST",
      body: JSON.stringify({
        intent_id: "00000000-0000-4000-8000-000000000001",
        confirm_testnet_transfer: true,
        wallet_address: "0xabc",
      }),
    }), { params: { id: "app-1" } });
    expect(rejected.status).toBe(400);

    submitMock.mockResolvedValueOnce({
      ok: false,
      code: CIRCLE_PUBLIC_CODES.duplicate_submit,
      activates_production: false,
      duplicate: true,
    });
    const duplicate = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/settlement/submit", {
      method: "POST",
      body: JSON.stringify({
        intent_id: "00000000-0000-4000-8000-000000000001",
        confirm_testnet_transfer: true,
      }),
    }), { params: { id: "app-1" } });
    expect(duplicate.status).toBe(409);
  });
});

