// FILE: lib/partner/walletBindingStatusRoute.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  application: vi.fn(),
  status: vi.fn(),
}));

vi.mock("@/lib/partner/launchpad/partnerConsoleSession", () => ({
  resolvePartnerConsoleSession: (...args: unknown[]) => mocks.session(...args),
}));
vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({
  getLaunchpadApplicationForPartner: (...args: unknown[]) => mocks.application(...args),
}));
vi.mock("@/lib/partner/walletBindingStatus", () => ({
  readStudioWalletBindingStatus: (...args: unknown[]) => mocks.status(...args),
}));

import { GET } from "@/app/api/developers/integration-studio/wallet-bindings/route";

function request(applicationId = "app-1") {
  return new NextRequest(
    `https://demo.abraxasworld.xyz/api/developers/integration-studio/wallet-bindings?application_id=${applicationId}`,
  );
}

describe("Integration Studio wallet binding status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ partnerId: "partner-1" });
    mocks.application.mockResolvedValue({
      id: "app-1",
      environment: "sandbox",
      policy_id: "sandbox_policy",
      policy_version: 1,
    });
    mocks.status.mockResolvedValue({
      solana: { ok: true, status: "bound", binding_ref: "wsb_safe", expires_at: "2030-01-01T00:00:00.000Z" },
      evm: { ok: false, status: "not_attached", binding_ref: null, expires_at: null },
    });
  });

  it("requires the existing partner console session", async () => {
    mocks.session.mockResolvedValue(null);
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(mocks.application).not.toHaveBeenCalled();
    expect(mocks.status).not.toHaveBeenCalled();
  });

  it("does not expose another partner's application", async () => {
    mocks.application.mockResolvedValue(null);
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(mocks.application).toHaveBeenCalledWith("app-1", "partner-1");
    expect(mocks.status).not.toHaveBeenCalled();
  });

  it("returns only safe opaque binding status", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      ok: true,
      application_id: "app-1",
      solana: { ok: true, status: "bound", binding_ref: "wsb_safe", expires_at: "2030-01-01T00:00:00.000Z" },
      evm: { ok: false, status: "not_attached", binding_ref: null, expires_at: null },
    });
    expect(JSON.stringify(body)).not.toMatch(/wallet_address|public_key|signature|api_key|partner_id/i);
  });
});
