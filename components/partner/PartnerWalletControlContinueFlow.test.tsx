// @vitest-environment jsdom
// FILE: components/partner/PartnerWalletControlContinueFlow.test.tsx

import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PartnerWalletControlContinueFlow } from "./PartnerWalletControlContinueFlow";
import { IDLE_PARTNER_FLOW_HANDOFF } from "@/lib/passport/partnerFlowHandoff";

vi.mock("@/components/wallet/WalletVerifyControlPanel", () => ({
  WalletVerifyControlPanel: ({ onSuccess }: { onSuccess?: () => void }) => (
    <button type="button" onClick={() => onSuccess?.()}>Mock verify</button>
  ),
}));

vi.mock("@/lib/auth/ensureBrowserSession", () => ({
  ensureBrowserSessionReadyForWalletAuth: vi.fn(async () => ({ ok: true })),
  probeBrowserSessionDetails: vi.fn(async () => ({ ok: true, holderSubjectId: "abx_hs_test0000000000000000000001" })),
}));

describe("PartnerWalletControlContinueFlow", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("method-qualification") && init?.method === "POST") {
          return {
            ok: true,
            json: async () => ({ ok: true, method_qualified: true }),
          } as Response;
        }
        if (url.includes("method-qualification")) {
          return {
            ok: true,
            json: async () => ({ method_qualified: false }),
          } as Response;
        }
        return { ok: false, json: async () => ({}) } as Response;
      }),
    );
  });

  it("routes qualified wallet control to partner consent instead of verification_requests", async () => {
    const onMethodQualifiedChange = vi.fn();
    const handoff = {
      ...IDLE_PARTNER_FLOW_HANDOFF,
      ready: true,
      isPartnerFlowContext: true,
    };

    render(
      <PartnerWalletControlContinueFlow
        partnerId="p1"
        partnerName="Demo App"
        policyId="p1-wallet_control-v1"
        verifyRequestId="vr_test000000000001"
        returnUrl="https://example.com/cb"
        returnLabel="Return"
        handoff={handoff}
        onSessionEstablished={() => undefined}
        onMethodQualifiedChange={onMethodQualifiedChange}
      />,
    );

    screen.getByRole("button", { name: "Mock verify" }).click();
    await vi.waitFor(() => {
      expect(onMethodQualifiedChange).toHaveBeenCalledWith(true);
    });
    expect(await screen.findByText(/Wallet control confirmed/i)).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Holder verification steps" })).toBeTruthy();
    expect(screen.queryByText(/This request could not be loaded/i)).toBeNull();
  });
});
