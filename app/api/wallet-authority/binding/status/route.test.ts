// FILE: app/api/wallet-authority/binding/status/route.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const SUBJECT = "0x" + "e".repeat(64);

const mockRequireBrowserSession = vi.fn();
const mockReadCanonicalWalletBindingTruth = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: (...args: unknown[]) => mockRequireBrowserSession(...args),
}));

vi.mock("@/lib/trust/readCanonicalWalletBinding", () => ({
  readCanonicalWalletBindingTruth: (...args: unknown[]) => mockReadCanonicalWalletBindingTruth(...args),
}));

import { GET } from "./route";

describe("GET /api/wallet-authority/binding/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireBrowserSession.mockResolvedValue({
      ok: true,
      session: { suiAddress: SUBJECT },
    });
  });

  it("returns unavailable without 503 when canonical read fails", async () => {
    mockReadCanonicalWalletBindingTruth.mockResolvedValue({
      persisted: false,
      status: "unavailable",
      binding_method: null,
      claim_active: false,
      repairable: false,
      read_error: "wallet_binding_read_failed",
    });

    const res = await GET(new NextRequest("http://localhost/api/wallet-authority/binding/status"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.wallet_binding_status).toBe("unavailable");
    expect(json.wallet_binding_read_error).toBe("wallet_binding_read_failed");
    expect(json.binding_status).toBe("unavailable");
  });

  it("returns ok when canonical binding is persisted", async () => {
    mockReadCanonicalWalletBindingTruth.mockResolvedValue({
      persisted: true,
      status: "active",
      binding_method: "zklogin",
      claim_active: true,
      repairable: false,
    });

    const res = await GET(new NextRequest("http://localhost/api/wallet-authority/binding/status"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.wallet_binding_status).toBe("ok");
    expect(json.persisted).toBe(true);
  });
});
