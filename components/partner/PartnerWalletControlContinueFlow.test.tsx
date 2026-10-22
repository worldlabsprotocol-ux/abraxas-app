// @vitest-environment jsdom
// FILE: components/partner/PartnerWalletControlContinueFlow.test.tsx

import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  afterEach(() => {
    cleanup();
  });

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
    // review → verify wallet → approve (consent)
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

    const continueBtn = await screen.findByRole("button", { name: "Continue to verify wallet" });
    fireEvent.click(continueBtn);
    const verifyBtn = await screen.findByRole("button", { name: "Mock verify" });
    fireEvent.click(verifyBtn);
    await waitFor(() => {
      expect(onMethodQualifiedChange).toHaveBeenCalledWith(true);
    });
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Approve sharing/i })).toBeTruthy();
    });
    expect(screen.getByRole("navigation", { name: "Verification progress" })).toBeTruthy();
    expect(screen.queryByText(/Authorization/i)).toBeNull();
    expect(screen.queryByText(/This request could not be loaded/i)).toBeNull();
  });

  it("does not call handoff.complete when consent is declined", async () => {
    const complete = vi.fn(async () => {});
    const handoff = {
      ...IDLE_PARTNER_FLOW_HANDOFF,
      ready: true,
      isPartnerFlowContext: true,
      phase: "idle" as const,
      complete,
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
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Continue to verify wallet" }));
    fireEvent.click(await screen.findByRole("button", { name: "Mock verify" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Decline$/i })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: /^Decline$/i }));
    expect(complete).not.toHaveBeenCalled();
    expect(screen.getByText(/You declined sharing/i)).toBeTruthy();
  });
});
