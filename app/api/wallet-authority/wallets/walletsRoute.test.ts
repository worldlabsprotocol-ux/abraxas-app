// FILE: app/api/wallet-authority/wallets/walletsRoute.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockSession = vi.fn();
const mockListHolderWalletViews = vi.fn();
const mockRevokeWalletBinding = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: (...args: unknown[]) => mockSession(...args),
}));

vi.mock("@/lib/walletAuthority/service", () => ({
  listHolderWalletViews: (...args: unknown[]) => mockListHolderWalletViews(...args),
  revokeWalletBinding: (...args: unknown[]) => mockRevokeWalletBinding(...args),
}));

describe("wallet-authority wallets routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.mockResolvedValue({
      ok: true,
      session: { suiAddress: "0x" + "a".repeat(64) },
    });
  });

  it("GET returns holder wallet views for authenticated session", async () => {
    mockListHolderWalletViews.mockResolvedValue([
      {
        id: "b1",
        chain: "evm",
        chainLabel: "Ethereum",
        network: "eip155:1",
        address: "0x1111111111111111111111111111111111111111",
        addressShort: "0x1111…1111",
        controlMethod: "siwe_evm",
        controlStatus: "verified",
        controlStatusLabel: "Control verified",
        verifiedAt: "2026-10-04T12:00:00.000Z",
        expiresAt: "2026-10-05T12:00:00.000Z",
        freshnessLabel: "Verified recently",
        bindingStatus: "active",
      },
    ]);

    const { GET } = await import("@/app/api/wallet-authority/wallets/route");
    const res = await GET(new NextRequest("http://localhost/api/wallet-authority/wallets"));
    const body = await res.json() as { wallets: Array<{ wallet_address: string; address_short: string }> };

    expect(res.status).toBe(200);
    expect(body.wallets).toHaveLength(1);
    expect(body.wallets[0]?.address_short).toBe("0x1111…1111");
  });

  it("GET rejects unauthenticated requests", async () => {
    mockSession.mockResolvedValue({ ok: false, error: "Unauthorized", status: 401 });
    const { GET } = await import("@/app/api/wallet-authority/wallets/route");
    const res = await GET(new NextRequest("http://localhost/api/wallet-authority/wallets"));
    expect(res.status).toBe(401);
  });

  it("DELETE revokes wallet for authenticated holder", async () => {
    mockRevokeWalletBinding.mockResolvedValue(true);
    const { DELETE } = await import("@/app/api/wallet-authority/wallets/[bindingId]/route");
    const req = new NextRequest("http://localhost/api/wallet-authority/wallets/b1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ bindingId: "b1" }) });
    expect(res.status).toBe(200);
    expect(mockRevokeWalletBinding).toHaveBeenCalledWith(expect.objectContaining({ bindingId: "b1" }));
  });
});
