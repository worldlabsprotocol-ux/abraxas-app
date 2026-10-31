import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { BROWSER_SESSION_COOKIE, issueBrowserSessionFromInput, resolveBrowserSession } from "./browserSession";

const holder = "abx_hs_0123456789abcdef0123456789abcdef";
const caip10 = "solana:devnet:11111111111111111111111111111111";
const { active, walletOwner } = vi.hoisted(() => ({ active: vi.fn(), walletOwner: vi.fn() }));

vi.mock("@/lib/auth/holderSubject/service", () => ({
  assertHolderSubjectExists: (...args: unknown[]) => active(...args),
  resolveVerifiedWalletSubjectId: (...args: unknown[]) => walletOwner(...args),
}));

describe("Solana browser session revocation", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-session-secret";
    active.mockReset().mockResolvedValue(true);
    walletOwner.mockReset().mockResolvedValue(holder);
  });

  async function requestForWallet() {
    const token = await issueBrowserSessionFromInput({
      authMethod: "solana_wallet", holderSubjectId: holder, walletCaip10: caip10,
    });
    if (!token) throw new Error("test_session_unavailable");
    const request = new NextRequest("https://abraxasworld.xyz/passport");
    request.cookies.set(BROWSER_SESSION_COOKIE, token);
    return request;
  }

  it("resolves the currently bound wallet", async () => {
    expect((await resolveBrowserSession(await requestForWallet()))?.subjectId).toBe(holder);
  });

  it("rejects the old cookie after deletion suspends the holder", async () => {
    active.mockResolvedValue(false);
    expect(await resolveBrowserSession(await requestForWallet())).toBeNull();
  });

  it("rejects the old cookie after the wallet binding is revoked or switched", async () => {
    const request = await requestForWallet();
    walletOwner.mockResolvedValue(null);
    expect(await resolveBrowserSession(request)).toBeNull();
    walletOwner.mockResolvedValue("abx_hs_ffffffffffffffffffffffffffffffff");
    expect(await resolveBrowserSession(request)).toBeNull();
  });
});
