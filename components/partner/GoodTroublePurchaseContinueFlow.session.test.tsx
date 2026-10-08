// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { GoodTroublePurchaseContinueFlow } from "./GoodTroublePurchaseContinueFlow";

vi.mock("@/components/partner/PartnerFlowReturnHandler", () => ({
  PartnerFlowReturnHandler: () => null,
}));
vi.mock("@/components/partner/GoodTroublePurchaseShareStep", () => ({
  GoodTroublePurchaseShareStep: () => <p>Share eligibility</p>,
}));

const props = {
  partnerId: "good-trouble",
  policyId: "good-trouble-age_21_retail-v1",
  partnerName: "Good Trouble",
  verifyRequestId: "vr-example",
  returnUrl: "https://example.test/return",
  suiAddress: "0x123",
  email: "",
  identityStatus: "not_started",
  identityComplete: false,
  veriffConfigured: false,
  idvProvider: "manual" as const,
  handoff: { ready: false, phase: "idle" } as Parameters<typeof GoodTroublePurchaseContinueFlow>[0]["handoff"],
  refresh: vi.fn(),
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Good Trouble DOB continuation session gate", () => {
  it.each([
    [401, { error: "Sign in required" }, "Session required"],
    [400, { code: "replay" }, "Verification link unavailable"],
    [400, { code: "stale" }, "Verification link unavailable"],
  ])("does not show DOB after qualification status %i", async (status, body, title) => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
    vi.stubGlobal("fetch", fetcher);
    render(<GoodTroublePurchaseContinueFlow {...props} />);
    await waitFor(() => expect(screen.getByText(title)).toBeTruthy());
    expect(screen.queryByLabelText("Month")).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("shows DOB only after a successful authenticated qualification response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true, method_qualified: false, issuedReceipt: false,
    }), { status: 200 })));
    render(<GoodTroublePurchaseContinueFlow {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Month")).toBeTruthy());
  });
});
