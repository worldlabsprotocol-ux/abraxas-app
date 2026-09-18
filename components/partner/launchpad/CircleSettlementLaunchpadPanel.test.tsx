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
});
