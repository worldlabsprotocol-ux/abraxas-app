// FILE: lib/auth/ephemeralWallet/walletActionChallengeRoute.test.ts
// Build 890 — wallet action challenge POST contract.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { buildWalletActionChallengeRequestBody } from "./walletActionChallengeClientRequest";

const scopeMock = vi.fn();
const issueMock = vi.fn();
const rateMock = vi.fn();

vi.mock("@/lib/auth/ephemeralWallet/walletSession", () => ({
  requireEphemeralWalletScope: (...args: unknown[]) => scopeMock(...args),
}));

vi.mock("@/lib/auth/ephemeralWallet/actionAuth", () => ({
  issueWalletActionChallenge: (...args: unknown[]) => issueMock(...args),
}));

vi.mock("@/lib/auth/nativeAccount/rateLimit", () => ({
  enforceNativeAuthRateLimit: (...args: unknown[]) => rateMock(...args),
}));

vi.mock("@/lib/auth/ephemeralWallet/apiGate", () => ({
  assertEphemeralWalletAuthOperational: async () => null,
  mapEphemeralStoreError: () => null,
}));

import { POST } from "@/app/api/auth/wallet/solana/action/challenge/route";

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/auth/wallet/solana/action/challenge", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
        host: "localhost:3000",
      },
      body: JSON.stringify(body),
    }),
  );
}

describe("wallet action challenge route contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scopeMock.mockResolvedValue({
      ok: true,
      session: { walletAddress: "11111111111111111111111111111111", solanaNetwork: "devnet" },
    });
    rateMock.mockResolvedValue({ allowed: true });
    issueMock.mockResolvedValue({
      ok: true,
      challenge: {
        challenge_id: "c1",
        message: "test",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        operation: "sandbox:enter",
      },
    });
  });

  it("accepts canonical challenge body", async () => {
    const body = buildWalletActionChallengeRequestBody({
      operation: "sandbox:enter",
      resource: "abraxas:sandbox:ws1:policy:wallet_control",
    });
    const res = await post(body);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("rejects unknown_field", async () => {
    const body = {
      ...buildWalletActionChallengeRequestBody({
        operation: "sandbox:enter",
        resource: "abraxas:sandbox:ws1",
      }),
      forged_admin: true,
    };
    const res = await post(body);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("unknown_field");
  });

  it("returns 401 without wallet session", async () => {
    scopeMock.mockResolvedValue({ ok: false, error: "session_required", status: 401 });
    const res = await post(
      buildWalletActionChallengeRequestBody({
        operation: "sandbox:enter",
        resource: "abraxas:sandbox:ws1",
      }),
    );
    expect(res.status).toBe(401);
  });
});
