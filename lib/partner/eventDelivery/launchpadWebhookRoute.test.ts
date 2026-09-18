import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const sessionMock = vi.fn();
const appMock = vi.fn();
const saveMock = vi.fn();
const overviewMock = vi.fn();

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

vi.mock("@/lib/partner/eventDelivery/launchpadWebhook", () => ({
  getLaunchpadWebhookOverview: (...args: unknown[]) => overviewMock(...args),
  saveLaunchpadWebhookEndpoint: (...args: unknown[]) => saveMock(...args),
  setLaunchpadWebhookEnabled: vi.fn(),
  removeLaunchpadWebhookEndpoint: vi.fn(),
}));

import { GET, POST } from "@/app/api/launchpad/applications/[id]/webhooks/route";

describe("launchpad webhook self-service routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.mockResolvedValue({ ok: true, session: { partnerId: "partner-a" } });
    appMock.mockResolvedValue({
      id: "app-1",
      partner_id: "partner-a",
      policy_id: "policy-v1",
      policy_version: 1,
      allowed_return_urls: ["https://partner.example/callback"],
    });
  });

  it("returns overview without secrets or payloads", async () => {
    overviewMock.mockResolvedValue({
      webhook_configured: true,
      signing_secret_prefix: "abx_whsec_abc",
      deliveries: [{ event_id: "evt-1", visible_state: "delivered" }],
      disclaimer: "not authorization",
    });
    const res = await GET(new NextRequest("http://localhost/api/launchpad/applications/app-1/webhooks"), {
      params: { id: "app-1" },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(JSON.stringify(body)).not.toMatch(/payload|email@|credential_jwt/);
  });

  it("returns a one-time signing secret on save", async () => {
    saveMock.mockResolvedValue({
      ok: true,
      config: { enabled: false, signing_secret_prefix: "abx_whsec_abc" },
      signing_secret: "abx_whsec_once_only_value",
      notice: "Copy the signing secret now",
    });
    const res = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/webhooks", {
      method: "POST",
      body: JSON.stringify({ endpoint_url: "https://hooks.example/abraxas" }),
    }), { params: { id: "app-1" } });
    const body = await res.json() as { signing_secret: string; secret_shown_once: boolean };
    expect(res.status).toBe(201);
    expect(body.signing_secret).toBe("abx_whsec_once_only_value");
    expect(body.secret_shown_once).toBe(true);
  });
});
