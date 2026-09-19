// @vitest-environment jsdom
// FILE: components/partner/PartnerContinueClient.redirect.test.tsx

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GOOD_TROUBLE_PARTNER_ID, GOOD_TROUBLE_RETAIL_POLICY_ID } from "@/lib/goodTrouble/constants";
import { PartnerContinueClient } from "./PartnerContinueClient";

const mockComplete = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/components/sui/SuiAuthProvider", () => ({
  useSuiAuth: () => ({
    suiAddress: "0xabc",
    isLoading: false,
    session: { email: "user@example.com" },
  }),
}));

vi.mock("@/lib/hooks/usePassportVerification", () => ({
  usePassportVerification: () => ({
    identityStatus: "earned",
    credential: { expires_at: new Date(Date.now() + 86400000).toISOString() },
    refresh: vi.fn(),
    setup: {
      walletBound: true,
      identityComplete: true,
    },
    veriffConfigured: false,
    idvProvider: "manual",
    walletBindingL3: true,
  }),
}));

vi.mock("@/lib/passport/partnerFlowHandoff", () => ({
  usePartnerFlowHandoff: () => ({
    ready: true,
    phase: "failed",
    inFlight: false,
    isPartnerFlowContext: true,
    failureCategory: "partner_flow_completion_failed",
    complete: mockComplete,
  }),
}));

describe("PartnerContinueClient partner redirect trust", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams({
      verify_request: "vr-retail-1",
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
      return: "https://evil.example/steal-session",
    });

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/v1/verification-requests/vr-retail-1")) {
        return new Response(JSON.stringify({
          partner_id: GOOD_TROUBLE_PARTNER_ID,
          policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
        }), { status: 200 });
      }
      if (url.includes("/api/age-assurance/providers")) {
        return new Response(JSON.stringify({ providers: [], existing_proof: { eligible_for_reuse: false } }), { status: 200 });
      }
      if (url.includes("/api/v1/partner-verify/continue-binding")) {
        return new Response(JSON.stringify({
          ok: true,
          partner_id: GOOD_TROUBLE_PARTNER_ID,
          policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
          return_url: "https://www.goodtroublecanna.com/age-verification-result",
        }), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;
  });

  afterEach(() => {
    cleanup();
  });

  it("uses the server handoff contract instead of navigating to the raw return param", async () => {
    render(<PartnerContinueClient />);

    const button = await screen.findByRole("button", { name: /return/i });
    await userEvent.click(button);

    await waitFor(() => {
      expect(mockComplete).toHaveBeenCalledTimes(1);
    });
  });
});
