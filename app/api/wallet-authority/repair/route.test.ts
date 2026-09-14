// FILE: app/api/wallet-authority/repair/route.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const SUBJECT = "0x" + "e".repeat(64);

const mockRequireBrowserSession = vi.fn();
const mockEnsureZkLoginWalletBinding = vi.fn();
const mockGetCanonicalWalletBindingSnapshot = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: (...args: unknown[]) => mockRequireBrowserSession(...args),
}));

vi.mock("@/lib/credentials/ensureZkLoginWalletBinding", () => ({
  ensureZkLoginWalletBinding: (...args: unknown[]) => mockEnsureZkLoginWalletBinding(...args),
  getCanonicalWalletBindingSnapshot: (...args: unknown[]) => mockGetCanonicalWalletBindingSnapshot(...args),
}));

import { POST } from "./route";

describe("POST /api/wallet-authority/repair", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireBrowserSession.mockResolvedValue({
      ok: true,
      session: { suiAddress: SUBJECT },
    });
  });

  it("does not return ok when canonical snapshot is not persisted", async () => {
    mockEnsureZkLoginWalletBinding.mockResolvedValue({
      status: "repaired",
      binding_method: "zklogin",
    });
    mockGetCanonicalWalletBindingSnapshot.mockResolvedValue({
      subject_id: SUBJECT,
      wallet_address: SUBJECT,
      persisted: false,
      binding_status: "missing",
      binding_method: null,
      claim_active: false,
      repairable: true,
    });

    const res = await POST(new NextRequest("http://localhost/api/wallet-authority/repair", { method: "POST" }));
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.ok).toBe(false);
    expect(json.persisted).toBe(false);
  });

  it("returns ok only when snapshot.persisted is true", async () => {
    mockEnsureZkLoginWalletBinding.mockResolvedValue({
      status: "repaired",
      binding_method: "zklogin",
    });
    mockGetCanonicalWalletBindingSnapshot.mockResolvedValue({
      subject_id: SUBJECT,
      wallet_address: SUBJECT,
      persisted: true,
      binding_status: "active",
      binding_method: "zklogin",
      claim_active: true,
      repairable: false,
    });

    const res = await POST(new NextRequest("http://localhost/api/wallet-authority/repair", { method: "POST" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.persisted).toBe(true);
  });
});
