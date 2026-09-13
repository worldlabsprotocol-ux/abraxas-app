// @vitest-environment jsdom
// FILE: components/partner/PartnerContinueClient.test.tsx

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import {
  GOOD_TROUBLE_BROWSE_CHECKING_STATE,
  GOOD_TROUBLE_BROWSE_EYEBROW,
  GOOD_TROUBLE_BROWSE_HEADING,
  GOOD_TROUBLE_BROWSE_PRIMARY_BUTTON,
  GOOD_TROUBLE_BROWSE_PROHIBITED_UI_PHRASES,
  GOOD_TROUBLE_BROWSE_SUPPORTING,
} from "@/lib/partner/goodTroubleBrowseFlow";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import { PartnerContinueClient } from "./PartnerContinueClient";

const mockAuthState = {
  suiAddress: "0xabc" as string | null,
  isLoading: false,
  session: { email: "user@example.com" },
};

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/components/sui/SuiAuthProvider", () => ({
  useSuiAuth: () => ({
    suiAddress: mockAuthState.suiAddress,
    isLoading: mockAuthState.isLoading,
    session: mockAuthState.session,
  }),
}));

vi.mock("@/lib/hooks/usePassportVerification", () => ({
  usePassportVerification: () => ({
    identityStatus: "not_started",
    credential: null,
    refresh: vi.fn(),
    setup: {
      walletBound: true,
      identityComplete: false,
    },
    veriffConfigured: false,
    idvProvider: "manual",
    walletBindingL3: false,
  }),
}));

vi.mock("@/lib/passport/partnerFlowHandoff", () => ({
  usePartnerFlowHandoff: () => ({
    ready: false,
    phase: "idle",
    inFlight: false,
    isPartnerFlowContext: true,
    failureCategory: null,
    complete: vi.fn(),
  }),
}));

describe("PartnerContinueClient Good Trouble browse journey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.suiAddress = "0xabc";
    mockAuthState.isLoading = false;
    mockSearchParams = new URLSearchParams({
      verify_request: "vr-browse-1",
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
      return: "https://www.goodtroublecanna.com/browse-verification-result?gtb=gtb_test",
    });

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/v1/verification-requests/vr-browse-1")) {
        return new Response(JSON.stringify({
          partner_id: GOOD_TROUBLE_PARTNER_ID,
          policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
        }), { status: 200 });
      }
      if (url.includes("/api/age-assurance/browse-reuse")) {
        return new Response(JSON.stringify({ ok: false, code: "no_reusable_browse_proof" }), { status: 404 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the simplified browse screen immediately after sign-in", async () => {
    render(<PartnerContinueClient />);

    await waitFor(() => {
      expect(screen.getByText(GOOD_TROUBLE_BROWSE_EYEBROW)).toBeTruthy();
    });

    expect(screen.getByRole("heading", { name: GOOD_TROUBLE_BROWSE_HEADING })).toBeTruthy();
    expect(screen.getByText(GOOD_TROUBLE_BROWSE_SUPPORTING)).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: GOOD_TROUBLE_BROWSE_PRIMARY_BUTTON })).toBeTruthy();
    });
    expect(screen.getByLabelText("Month")).toBeTruthy();
    expect(screen.queryByText("Return pending")).toBeNull();
    expect(screen.queryByText("PartnerFlowReturnHandler")).toBeNull();
  });

  it("does not show prohibited technical copy on the browse screen", async () => {
    const { container } = render(<PartnerContinueClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: GOOD_TROUBLE_BROWSE_PRIMARY_BUTTON })).toBeTruthy();
    });

    const text = container.textContent ?? "";
    for (const phrase of GOOD_TROUBLE_BROWSE_PROHIBITED_UI_PHRASES) {
      expect(text).not.toContain(phrase);
    }
  });

  it("enables browse flow from authoritative verification request when purpose is missing from URL", async () => {
    mockSearchParams = new URLSearchParams({
      verify_request: "vr-browse-1",
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
      return: "https://www.goodtroublecanna.com/browse-verification-result?gtb=gtb_test",
    });

    render(<PartnerContinueClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: GOOD_TROUBLE_BROWSE_PRIMARY_BUTTON })).toBeTruthy();
    });
  });

  it("does not enable browse flow for retail policy with browse purpose in URL", async () => {
    mockSearchParams = new URLSearchParams({
      verify_request: "vr-retail-1",
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
      purpose: "browse",
      return: "https://www.goodtroublecanna.com/age-verification-result?gtv=gtv_test",
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
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    render(<PartnerContinueClient />);

    await waitFor(() => {
      expect(screen.getByText(/Verify eligibility for purchase/i)).toBeTruthy();
    });
    expect(screen.queryByRole("button", { name: GOOD_TROUBLE_BROWSE_PRIMARY_BUTTON })).toBeNull();
    expect(screen.queryByText("Return pending")).toBeNull();
  });

  it("auto-returns returning users when reusable browse proof exists", async () => {
    const replaceSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, replace: replaceSpy },
    });

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/v1/verification-requests/vr-browse-1")) {
        return new Response(JSON.stringify({
          partner_id: GOOD_TROUBLE_PARTNER_ID,
          policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
        }), { status: 200 });
      }
      if (url.includes("/api/age-assurance/browse-reuse")) {
        return new Response(JSON.stringify({
          ok: true,
          browse_receipt: "jwt-token",
          redirect_url: "https://www.goodtroublecanna.com/browse-verification-result?browse_receipt=jwt-token",
        }), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    render(<PartnerContinueClient />);

    await waitFor(() => {
      expect(replaceSpy).toHaveBeenCalled();
    });
  });

  it("shows checking state before DOB form while reuse is probed", async () => {
    let resolveReuse!: (value: Response) => void;
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/v1/verification-requests/vr-browse-1")) {
        return new Response(JSON.stringify({
          partner_id: GOOD_TROUBLE_PARTNER_ID,
          policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
        }), { status: 200 });
      }
      if (url.includes("/api/age-assurance/browse-reuse")) {
        return new Promise<Response>((resolve) => {
          resolveReuse = resolve;
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    render(<PartnerContinueClient />);

    await waitFor(() => {
      expect(screen.getByText(GOOD_TROUBLE_BROWSE_CHECKING_STATE)).toBeTruthy();
    });

    resolveReuse(new Response(JSON.stringify({ ok: false }), { status: 404 }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: GOOD_TROUBLE_BROWSE_PRIMARY_BUTTON })).toBeTruthy();
    });
  });
});
