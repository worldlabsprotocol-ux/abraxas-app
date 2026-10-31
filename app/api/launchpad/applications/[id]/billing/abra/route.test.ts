import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.hoisted(() => ({
  session: vi.fn(), application: vi.fn(), limited: vi.fn(),
  quote: vi.fn(), persist: vi.fn(), settle: vi.fn(),
}));
vi.mock("@/lib/partner/launchpad/apiHelpers", () => ({
  requireLaunchpadSession: auth.session, enforceLaunchpadTenantRateLimit: auth.limited,
  launchpadError: (code: string, status: number) => Response.json({ ok: false, code }, { status }),
  launchpadJson: (body: unknown, status = 200) => Response.json(body, { status }),
}));
vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication.server", () => ({
  getLaunchpadApplicationForPartner: auth.application,
}));
vi.mock("@/lib/partner/billing/abraPayments.server", () => ({
  prepareAbraPaymentQuote: auth.quote, persistAbraPaymentQuote: auth.persist,
  settleAbraPayment: auth.settle,
}));

import { POST, PUT } from "./route";
const context = { params: { id: "00000000-0000-0000-0000-000000000001" } };
const url = "http://localhost/api/launchpad/applications/00000000-0000-0000-0000-000000000001/billing/abra";
function request(method: "POST" | "PUT", body: unknown) {
  return new NextRequest(url, { method, headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.clearAllMocks();
  auth.session.mockResolvedValue({ ok: true, session: { partnerId: "partner-a" } });
  auth.application.mockResolvedValue({ id: context.params.id, environment: "production" });
  auth.limited.mockResolvedValue(null);
});

describe("ABRA billing route safety gate", () => {
  it("requires a Launchpad session", async () => {
    auth.session.mockResolvedValue({ ok: false, response: Response.json({}, { status: 401 }) });
    expect((await POST(request("POST", { plan_id: "launch" }), context)).status).toBe(401);
    expect(auth.quote).not.toHaveBeenCalled();
  });
  it("rejects cross-tenant application access", async () => {
    auth.application.mockResolvedValue(null);
    expect((await POST(request("POST", { plan_id: "launch" }), context)).status).toBe(404);
    expect(auth.application).toHaveBeenCalledWith(context.params.id, "partner-a");
    expect(auth.quote).not.toHaveBeenCalled();
  });
  it("keeps sandbox free and live quote creation disabled", async () => {
    auth.application.mockResolvedValue({ id: context.params.id, environment: "sandbox" });
    expect((await POST(request("POST", { plan_id: "launch" }), context)).status).toBe(400);
    auth.application.mockResolvedValue({ id: context.params.id, environment: "production" });
    const result = await POST(request("POST", { plan_id: "launch" }), context);
    expect(result.status).toBe(503);
    expect((await result.json()).code).toBe("abra_checkout_unavailable");
    expect(auth.quote).not.toHaveBeenCalled();
    expect(auth.persist).not.toHaveBeenCalled();
  });
  it("never settles a submitted signature while checkout is disabled", async () => {
    const result = await PUT(request("PUT", {
      intent_id: "00000000-0000-0000-0000-000000000002",
      signature: "1".repeat(88),
    }), context);
    expect(result.status).toBe(503);
    expect(auth.settle).not.toHaveBeenCalled();
  });
});

