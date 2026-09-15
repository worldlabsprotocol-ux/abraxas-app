// FILE: lib/settlement/settlementApiSecurity.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const requireBrowserSessionMock = vi.fn();
const prepareSettlementMock = vi.fn();
const recordConfirmationMock = vi.fn();
const getCanonicalWalletMock = vi.fn();
const assertReceiptSubjectMock = vi.fn();
const getAppBySlugMock = vi.fn();
const requireSettlementPartnerAuthMock = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: (...args: unknown[]) => requireBrowserSessionMock(...args),
}));

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({
  getLaunchpadApplicationBySlug: (...args: unknown[]) => getAppBySlugMock(...args),
}));

vi.mock("@/lib/settlement/SettlementAuthorizationService", () => ({
  prepareSettlementAuthorization: (...args: unknown[]) => prepareSettlementMock(...args),
  recordSettlementConfirmation: (...args: unknown[]) => recordConfirmationMock(...args),
  getSettlementAuthorizationStatus: vi.fn(),
  getArcSettlementConfig: vi.fn(),
}));

vi.mock("@/lib/settlement/walletOwnership.server", () => ({
  getCanonicalEvmWalletForSubject: (...args: unknown[]) => getCanonicalWalletMock(...args),
  assertReceiptSubjectMatchesSession: (...args: unknown[]) => assertReceiptSubjectMock(...args),
}));

vi.mock("@/lib/settlement/settlementApiHelpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/settlement/settlementApiHelpers")>(
    "@/lib/settlement/settlementApiHelpers",
  );
  return {
    ...actual,
    requireSettlementPartnerAuth: (...args: unknown[]) => requireSettlementPartnerAuthMock(...args),
  };
});

describe("settlement API security boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireBrowserSessionMock.mockResolvedValue({ ok: false, error: "unauthorized", status: 401 });
    getAppBySlugMock.mockResolvedValue(null);
    prepareSettlementMock.mockResolvedValue({ ok: false, code: "settlement_unauthorized" });
    recordConfirmationMock.mockResolvedValue({ ok: false, code: "settlement_unauthorized" });
    requireSettlementPartnerAuthMock.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ ok: false }), { status: 401 }),
    });
  });

  it("public authorize rejects unauthenticated browser sessions", async () => {
    const { POST } = await import("@/app/api/launchpad/public/settlement/authorize/route");
    const res = await POST(new NextRequest("http://localhost/api/launchpad/public/settlement/authorize", {
      method: "POST",
      body: JSON.stringify({ app: "demo", receipt_id: "dr_x", amount_micro_usdc: "10000" }),
    }));
    expect(res.status).toBe(401);
  });

  it("public authorize binds wallet from session not request body", async () => {
    requireBrowserSessionMock.mockResolvedValue({
      ok: true,
      session: { suiAddress: "0xsession" },
    });
    getAppBySlugMock.mockResolvedValue({
      id: "app-1",
      partner_id: "partner-1",
      status: "active",
      environment: "sandbox",
    });
    assertReceiptSubjectMock.mockResolvedValue({ ok: true });
    getCanonicalWalletMock.mockResolvedValue("0xCanonical00000000000000000000000000000001");
    prepareSettlementMock.mockResolvedValue({
      ok: true,
      authorization: {
        authorizationId: "auth-1",
        payload: { chainId: 5042002n, token: "0xt", recipient: "0xr", eligibleWallet: "0xCanonical00000000000000000000000000000001", amountMicroUsdc: 10000n },
        signature: "0xsig",
        typedData: { domain: { verifyingContract: "0xcontract" } },
        expiresAtIso: new Date().toISOString(),
        settlementReference: "ref",
        signerAddress: "0xsigner",
      },
      feeQuote: { baseAmountMicroUsdc: 10000n, feeMicroUsdc: 0n, feeActive: false, feeLabel: "No settlement fee" },
    });

    const { POST } = await import("@/app/api/launchpad/public/settlement/authorize/route");
    const res = await POST(new NextRequest("http://localhost/api/launchpad/public/settlement/authorize", {
      method: "POST",
      body: JSON.stringify({
        app: "demo",
        receipt_id: "dr_x",
        amount_micro_usdc: "10000",
        eligible_wallet: "0xAttacker00000000000000000000000000000002",
      }),
    }));
    expect(res.status).toBe(200);
    expect(prepareSettlementMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eligibleWallet: "0xCanonical00000000000000000000000000000001",
        subjectId: "0xsession",
        environment: "sandbox",
      }),
    );
  });

  it("confirm endpoint only accepts authorization id and transaction hash", async () => {
    requireSettlementPartnerAuthMock.mockResolvedValue({
      ok: true,
      partnerId: "partner-1",
      applicationId: "app-1",
    });
    recordConfirmationMock.mockResolvedValue({ ok: true });

    const { POST } = await import("@/app/api/launchpad/applications/[id]/settlement/confirm/route");
    const res = await POST(
      new NextRequest("http://localhost/api/launchpad/applications/app-1/settlement/confirm", {
        method: "POST",
        body: JSON.stringify({
          authorization_id: "auth-1",
          transaction_hash: "0xhash",
          payer_wallet: "0xfake",
          amount_micro_usdc: "999999",
        }),
      }),
      { params: { id: "app-1" } },
    );
    expect(res.status).toBe(200);
    expect(recordConfirmationMock).toHaveBeenCalledWith({
      applicationId: "app-1",
      partnerId: "partner-1",
      authorizationId: "auth-1",
      transactionHash: "0xhash",
    });
  });

  it("confirm rejects unauthenticated partner requests", async () => {
    const { POST } = await import("@/app/api/launchpad/applications/[id]/settlement/confirm/route");
    const res = await POST(
      new NextRequest("http://localhost/api/launchpad/applications/app-1/settlement/confirm", {
        method: "POST",
        body: JSON.stringify({ authorization_id: "a", transaction_hash: "0x" }),
      }),
      { params: { id: "app-1" } },
    );
    expect(res.status).toBe(401);
  });
});
