// FILE: lib/passport/runPassportWalletBind.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

const repairMock = vi.fn();

vi.mock("@/lib/walletAuthority/client/repairZkLoginBinding", () => ({
  repairZkLoginBinding: (...args: unknown[]) => repairMock(...args),
}));

import { runPassportWalletBind } from "./runPassportWalletBind";

describe("runPassportWalletBind", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires reauthentication when browser session is not ready", async () => {
    const requireReauthentication = vi.fn();
    const result = await runPassportWalletBind({
      browserSessionReady: false,
      requireReauthentication,
      onWalletBound: vi.fn(),
    });

    expect(result).toEqual({
      ok: false,
      kind: "reauthentication_required",
      message: "",
    });
    expect(requireReauthentication).toHaveBeenCalled();
    expect(repairMock).not.toHaveBeenCalled();
  });

  it("rejects repair success without persisted confirmation from API", async () => {
    repairMock.mockResolvedValue({
      ok: false,
      status: 503,
      error: "Wallet binding repair failed",
    });

    const result = await runPassportWalletBind({
      browserSessionReady: true,
      requireReauthentication: vi.fn(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("repair_failed");
    }
  });

  it("fails when canonical refresh still reports unbound wallet", async () => {
    repairMock.mockResolvedValue({ ok: true, wallet_binding_status: "repaired" });

    const result = await runPassportWalletBind({
      browserSessionReady: true,
      requireReauthentication: vi.fn(),
      onWalletBound: async () => ({
        walletBound: false,
        walletBindingStatus: "missing",
      }),
    });

    expect(result).toEqual({
      ok: false,
      kind: "refresh_unbound",
      message: "Wallet binding did not save. Try again.",
    });
  });

  it("succeeds when repair and canonical refresh both confirm binding", async () => {
    repairMock.mockResolvedValue({ ok: true, wallet_binding_status: "repaired" });

    const result = await runPassportWalletBind({
      browserSessionReady: true,
      requireReauthentication: vi.fn(),
      onWalletBound: async () => ({
        walletBound: true,
        walletBindingStatus: "active",
      }),
    });

    expect(result.ok).toBe(true);
  });
});
