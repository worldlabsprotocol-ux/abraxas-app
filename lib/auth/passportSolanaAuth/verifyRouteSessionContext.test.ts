// FILE: lib/auth/passportSolanaAuth/verifyRouteSessionContext.test.ts
// Documents HTTP-layer session_context_mismatch (missing cookie) vs service-layer replay.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as verifyPost } from "@/app/api/auth/passport-solana/verify/route";

vi.mock("@/lib/persistence/chainNeutralSchemaReady", () => ({
  requireChainNeutralIdentitySchema: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/auth/passportWalletAuth/origin", () => ({
  resolvePassportWalletRequestOrigin: vi.fn(() => "https://demo.abraxasworld.xyz"),
  assertPassportWalletSameOriginRequest: vi.fn(() => true),
}));

vi.mock("@/lib/auth/passportSolanaAuth/service", () => ({
  verifyPassportSolanaAuth: vi.fn(async () => ({ ok: true, holderSubjectId: "abx_hs_test", caip10: "sol:dev", created: false })),
  readHolderAuthContextCookie: vi.fn(() => null),
  clearHolderAuthContextCookie: vi.fn(),
}));

vi.mock("@/lib/auth/browserSession", () => ({
  issueBrowserSessionFromInput: vi.fn(async () => "token"),
  attachBrowserSessionCookie: vi.fn(),
}));

describe("passport-solana verify route session context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns session_context_mismatch when holder auth context cookie is absent", async () => {
    const req = new NextRequest("https://demo.abraxasworld.xyz/api/auth/passport-solana/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challenge_id: "c1",
        wallet_address: "abc",
        solana_network: "devnet",
        signature: "sig",
        intended_action: "partner_verify",
      }),
    });

    const res = await verifyPost(req);
    const body = await res.json() as { ok?: boolean; code?: string };
    expect(res.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("session_context_mismatch");
  });
});
