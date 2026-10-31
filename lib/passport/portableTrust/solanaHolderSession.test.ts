import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  walletOwner: vi.fn(),
}));

vi.mock("@/lib/auth/browserSession", () => ({ requireBrowserSession: mocks.session }));
vi.mock("@/lib/auth/holderSubject/service", () => ({ resolveVerifiedWalletSubjectId: mocks.walletOwner }));

import { resolveAuthenticatedHolderSession } from "./resolveHolderSession";

const holder = `abx_hs_${"a".repeat(32)}`;
const other = `abx_hs_${"b".repeat(32)}`;
const wallet = "11111111111111111111111111111111";
const caip = `solana:devnet:${wallet}`;

function signedSession(overrides: Record<string, unknown> = {}) {
  return {
    ok: true as const,
    session: {
      subjectId: holder,
      holderSubjectId: holder,
      authMethod: "solana_wallet",
      walletCaip10: caip,
      ...overrides,
    },
  };
}

describe("Solana Passport credential ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue(signedSession());
    mocks.walletOwner.mockResolvedValue(holder);
  });

  const request = (suffix = "") => new NextRequest(`http://localhost/api/passport/reusable-credentials${suffix}`);

  it("resolves the holder only after rechecking the verified wallet binding", async () => {
    const result = await resolveAuthenticatedHolderSession(request());
    expect(result).toMatchObject({ ok: true, subjectId: holder });
    expect(mocks.walletOwner).toHaveBeenCalledWith(caip);
  });

  it("rejects a wallet rebound to another holder", async () => {
    mocks.walletOwner.mockResolvedValue(other);
    expect(await resolveAuthenticatedHolderSession(request())).toMatchObject({ ok: false, error: "forbidden" });
  });

  it("rejects missing or expired browser sessions", async () => {
    mocks.session.mockResolvedValue({ ok: false, status: 401, error: "Sign in required" });
    expect(await resolveAuthenticatedHolderSession(request())).toMatchObject({ ok: false, error: "unauthorized" });
    expect(mocks.walletOwner).not.toHaveBeenCalled();
  });

  it("rejects legacy address sessions and client-supplied holder selectors", async () => {
    mocks.session.mockResolvedValue(signedSession({ subjectId: `0x${"1".repeat(64)}`, holderSubjectId: undefined, authMethod: "oauth" }));
    expect(await resolveAuthenticatedHolderSession(request())).toMatchObject({ ok: false, error: "forbidden" });
    mocks.session.mockResolvedValue(signedSession());
    expect(await resolveAuthenticatedHolderSession(request(`?holder_subject_id=${other}`))).toMatchObject({ ok: false, error: "forbidden" });
    expect(await resolveAuthenticatedHolderSession(new NextRequest(request().url, {
      headers: { "x-abraxas-holder-subject": other },
    }))).toMatchObject({ ok: false, error: "forbidden" });
  });

  it("fails closed when binding storage is unavailable", async () => {
    mocks.walletOwner.mockRejectedValue(new Error("database_unavailable"));
    expect(await resolveAuthenticatedHolderSession(request())).toMatchObject({ ok: false, error: "forbidden" });
  });
});
