// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { CircleSettlementLaunchpadPanel } from "@/components/partner/launchpad/CircleSettlementLaunchpadPanel";

describe("CircleSettlementLaunchpadPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("eligible-receipts")) {
        return new Response(JSON.stringify({
          ok: true,
          receipts: [{
            selection_token: "opaque-token",
            decision_state: "approved",
            issued_at: "2026-09-19T09:55:00.000Z",
            policy_version: 1,
            environment: "sandbox",
            eligibility_summary: "Sandbox product eligibility. Not identity verification. Not usable in Production.",
            amount_minor: 10000,
            network: "ARC-TESTNET",
            currency: "USDC",
          }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        ok: true,
        available: false,
        code: "circle_unavailable",
        activates_production: false,
        not_a_custodian: true,
        intent_is_not_a_payment: true,
        evidence: null,
      }), { status: 200 });
    }) as typeof fetch;
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the Preview-safe unavailable state and does not activate production", async () => {
    const { findByText, queryByText } = render(createElement(CircleSettlementLaunchpadPanel, {
      applicationId: "app-1",
    }));
    expect(await findByText(/Arc testnet settlement/)).toBeTruthy();
    expect(await findByText(/not a custodian/i)).toBeTruthy();
    expect(await findByText(/circle_unavailable/)).toBeTruthy();
    expect(queryByText(/^Activate production$/i)).toBeNull();
    expect(queryByText(/Signed receipt ID/i)).toBeNull();
    expect(await findByText(/Eligible sandbox receipts/)).toBeTruthy();
    expect(await findByText(/Create DEMO settlement intent/)).toBeTruthy();
    expect(await findByText(/Submit testnet transfer stays unavailable/)).toBeTruthy();
  });

  it("shows a reviewable pending card and the distinct submit action", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("eligible-receipts")) {
        return new Response(JSON.stringify({ ok: true, receipts: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({
      ok: true,
      available: true,
      code: "settlement_pending",
      activates_production: false,
      not_a_custodian: true,
      intent_is_not_a_payment: true,
      evidence: {
        intent_id: "00000000-0000-4000-8000-000000000001",
        state: "pending",
        network: "ARC-TESTNET",
        currency: "USDC",
        amount_minor: 10_000,
        policy_id: "policy-1",
        policy_version: 1,
        label: "sandbox/testnet",
      },
    }), { status: 200 });
    }) as typeof fetch;
    const { findByText, queryByText } = render(createElement(CircleSettlementLaunchpadPanel, {
      applicationId: "app-1",
    }));
    expect(await findByText(/No funds moved yet/)).toBeTruthy();
    expect(await findByText(/Pending intent — sandbox\/testnet/)).toBeTruthy();
    expect(await findByText(/Submit testnet transfer/)).toBeTruthy();
    expect(await findByText(/amount_minor: 10000/)).toBeTruthy();
    expect(queryByText(/receipt_id/i)).toBeNull();
    expect(queryByText(/Signed receipt ID/i)).toBeNull();
  });

  it("shows pending evidence in Judge Demo without a Circle submit control", async () => {
    vi.stubEnv("NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO", "true");
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("eligible-receipts")) {
        return new Response(JSON.stringify({ ok: true, receipts: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({
        ok: true,
        available: true,
        code: "settlement_pending",
        activates_production: false,
        not_a_custodian: true,
        intent_is_not_a_payment: true,
        evidence: {
          intent_id: "00000000-0000-4000-8000-000000000001",
          state: "pending",
          network: "ARC-TESTNET",
          currency: "USDC",
          amount_minor: 10_000,
          policy_id: "policy-1",
          policy_version: 1,
          label: "sandbox/testnet",
        },
      }), { status: 200 });
    }) as typeof fetch;
    const { findByText, queryByText } = render(createElement(CircleSettlementLaunchpadPanel, {
      applicationId: "app-1",
    }));
    expect(await findByText(/Pending intent — sandbox\/testnet/)).toBeTruthy();
    expect(await findByText(/cannot consume testnet funds/i)).toBeTruthy();
    expect(queryByText(/^Submit testnet transfer$/)).toBeNull();
  });
});
