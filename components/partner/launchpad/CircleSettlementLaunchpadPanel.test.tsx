// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { CircleSettlementLaunchpadPanel } from "@/components/partner/launchpad/CircleSettlementLaunchpadPanel";

describe("CircleSettlementLaunchpadPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      available: false,
      code: "circle_unavailable",
      activates_production: false,
      not_a_custodian: true,
      intent_is_not_a_payment: true,
      evidence: null,
    }), { status: 200 })) as typeof fetch;
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
  });

  it("shows a reviewable pending card and the distinct submit action", async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({
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
        receipt_id: "receipt-1",
        policy_id: "policy-1",
        policy_version: 1,
        label: "sandbox/testnet",
      },
    }), { status: 200 })) as typeof fetch;
    const { findByText } = render(createElement(CircleSettlementLaunchpadPanel, {
      applicationId: "app-1",
    }));
    expect(await findByText(/No funds moved yet/)).toBeTruthy();
    expect(await findByText(/Pending intent — sandbox\/testnet/)).toBeTruthy();
    expect(await findByText(/Submit testnet transfer/)).toBeTruthy();
    expect(await findByText(/amount_minor: 10000/)).toBeTruthy();
  });
});
