// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("advances from DOB to the explicit share/consent step only after self-attestation and qualification succeed", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, method_qualified: false }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, age_band: "over_21" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, method_qualified: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    render(<GoodTroublePurchaseContinueFlow {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Month")).toBeTruthy());
    expect(screen.queryByText("Share eligibility")).toBeNull();
    fireEvent.change(screen.getByLabelText("Month"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Day"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Year"), { target: { value: "1990" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(screen.getByText("Share eligibility")).toBeTruthy());
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({ method: "POST", credentials: "include" });
    expect(fetcher.mock.calls[2]?.[1]).toMatchObject({ method: "POST", credentials: "include" });
  });
});
