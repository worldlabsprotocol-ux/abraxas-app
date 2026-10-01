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
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import {
  GOOD_TROUBLE_PURCHASE_INTRO,
  GOOD_TROUBLE_PURCHASE_TITLE,
  GOOD_TROUBLE_PURCHASE_VERIFY_ACTION,
} from "@/lib/partner/goodTroublePurchaseFlow";
import userEvent from "@testing-library/user-event";
import { PartnerContinueClient } from "./PartnerContinueClient";

const GOOD_TROUBLE_PURCHASE_PROHIBITED_PHRASES = [
  "Partner-provided eligibility check",
  "Choose a qualifying method first",
  "selecting a method does not issue",
  "signed result",
  "result category",
  "assurance L2",
  "meets policy assurance",
  "age_eligible_21",
  "Return to Passport",
] as const;

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
    refreshSession: vi.fn(),
    signInWithGoogle: vi.fn(),
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
      if (url.includes("/api/v1/partner-verify/method-qualification")) {
        return new Response(JSON.stringify({
          ok: true,
          method_qualified: false,
          issuedReceipt: false,
        }), { status: 200 });
      }
      if (url.includes("/api/v1/partner-verify/continue-binding")) {
        return new Response(JSON.stringify({
          ok: true,
          partner_id: GOOD_TROUBLE_PARTNER_ID,
          policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
          return_url: "https://www.goodtroublecanna.com/browse-verification-result?gtb=gtb_test",
        }), { status: 200 });
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

  it("shows browse chrome during context load when browse policy is in URL without purpose", async () => {
    mockSearchParams = new URLSearchParams({
      verify_request: "vr-browse-1",
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
      return: "https://www.goodtroublecanna.com/browse-verification-result?gtb=gtb_test",
    });

    render(<PartnerContinueClient />);

    await waitFor(() => {
      expect(screen.getByText(GOOD_TROUBLE_BROWSE_EYEBROW)).toBeTruthy();
    });
    expect(screen.getByRole("heading", { name: GOOD_TROUBLE_BROWSE_HEADING })).toBeTruthy();
    expect(screen.queryByText(/Verify eligibility for purchase/i)).toBeNull();
    expect(screen.queryByText(/Continue with ID Verification/i)).toBeNull();
    expect(screen.queryByText(/Return pending/i)).toBeNull();
    expect(screen.queryByText(/Use Good Trouble's age check/i)).toBeNull();
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
      if (url.includes("/api/v1/partner-verify/method-qualification")) {
        return new Response(JSON.stringify({
          ok: true,
          method_qualified: false,
          issuedReceipt: false,
        }), { status: 200 });
      }
      if (url.includes("/api/v1/partner-verify/continue-binding")) {
        return new Response(JSON.stringify({
          ok: true,
          return_url: "https://www.goodtroublecanna.com/browse-verification-result?gtb=gtb_test",
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
      if (url.includes("/api/v1/partner-verify/method-qualification")) {
        return new Response(JSON.stringify({
          ok: true,
          method_qualified: false,
          issuedReceipt: false,
        }), { status: 200 });
      }
      if (url.includes("/api/v1/partner-verify/continue-binding")) {
        return new Response(JSON.stringify({
          ok: true,
          return_url: "https://www.goodtroublecanna.com/browse-verification-result?gtb=gtb_test",
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

describe("PartnerContinueClient holder recovery", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("explains a missing continue link without leaking query or backend details", async () => {
    mockAuthState.suiAddress = "0xabc";
    mockAuthState.isLoading = false;
    mockSearchParams = new URLSearchParams({
      return_url: "https://evil.example/callback",
      receipt_id: "dr_secret",
    });
    global.fetch = vi.fn() as typeof fetch;
    const { container } = render(<PartnerContinueClient />);
    await waitFor(() => {
      expect(screen.getByText(/could not be found/i)).toBeTruthy();
    });
    expect(container.textContent).not.toMatch(/evil\.example|dr_secret|receipt_id|SQLSTATE/i);
  });

  it("bootstraps canonical Good Trouble purchase continue flow without mandatory Google", async () => {
    mockAuthState.suiAddress = null;
    mockAuthState.isLoading = false;
    mockSearchParams = new URLSearchParams({
      verify_request: "vr-canonical",
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    });
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/hosted-holder/bootstrap")) {
        mockAuthState.suiAddress = "0xhosted";
        return new Response(JSON.stringify({ ok: true, sui_address: "0xhosted" }), { status: 200 });
      }
      if (url.includes("/api/v1/verification-requests/vr-canonical")) {
        return new Response(JSON.stringify({
          partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
          policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
        }), { status: 200 });
      }
      if (url.includes("continue-binding") || url.includes("method-qualification")) {
        return new Response(JSON.stringify({ ok: true, method_qualified: false }), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    render(<PartnerContinueClient />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/hosted-holder/bootstrap"),
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(screen.queryByText(/Sign in to continue/i)).toBeNull();
  });

  it("shows one obvious verify action for canonical Good Trouble purchase holders", async () => {
    mockAuthState.suiAddress = "0xabc";
    mockAuthState.isLoading = false;
    mockSearchParams = new URLSearchParams({
      verify_request: "vr-canonical-purchase",
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    });

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/v1/verification-requests/vr-canonical-purchase")) {
        return new Response(JSON.stringify({
          partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
          policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
        }), { status: 200 });
      }
      if (url.includes("/api/v1/partner-verify/continue-binding")) {
        return new Response(JSON.stringify({
          ok: true,
          return_url: "https://www.goodtroublecanna.com/age-verification-result?gtv=gtv_test",
        }), { status: 200 });
      }
      if (url.includes("/api/v1/partner-verify/method-qualification")) {
        return new Response(JSON.stringify({
          ok: true,
          method_qualified: false,
          issuedReceipt: false,
        }), { status: 200 });
      }
      if (url.includes("/api/age-assurance/providers")) {
        return new Response(JSON.stringify({
          ok: true,
          providers: [],
          existing_proof: { status: "none", eligible_for_reuse: false },
        }), { status: 200 });
      }
      if (url.includes("/api/reclaim/availability")) {
        return new Response(JSON.stringify({ available: false }), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const { container } = render(<PartnerContinueClient />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: GOOD_TROUBLE_PURCHASE_TITLE })).toBeTruthy();
      expect(screen.getByRole("button", { name: GOOD_TROUBLE_PURCHASE_VERIFY_ACTION })).toBeTruthy();
    });

    expect(screen.getByText(GOOD_TROUBLE_PURCHASE_INTRO)).toBeTruthy();
    expect(screen.getByText("Verify age")).toBeTruthy();
    expect(screen.queryByText("Share result")?.closest("li")?.className ?? "").not.toContain("--done");
    expect(screen.queryByText("Consent")?.closest("li")?.className ?? "").not.toContain("--done");

    const text = container.textContent ?? "";
    for (const phrase of GOOD_TROUBLE_PURCHASE_PROHIBITED_PHRASES) {
      expect(text).not.toContain(phrase);
    }
  });

  it("starts the existing qualifying verification flow when Verify my age is clicked", async () => {
    mockAuthState.suiAddress = "0xabc";
    mockSearchParams = new URLSearchParams({
      verify_request: "vr-canonical-purchase",
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    });

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/v1/verification-requests/vr-canonical-purchase")) {
        return new Response(JSON.stringify({
          partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
          policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
        }), { status: 200 });
      }
      if (url.includes("continue-binding") || url.includes("method-qualification")) {
        return new Response(JSON.stringify({ ok: true, method_qualified: false }), { status: 200 });
      }
      if (url.includes("/api/age-assurance/providers")) {
        return new Response(JSON.stringify({ ok: true, providers: [] }), { status: 200 });
      }
      if (url.includes("/api/reclaim/availability")) {
        return new Response(JSON.stringify({ available: false }), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    render(<PartnerContinueClient />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: GOOD_TROUBLE_PURCHASE_VERIFY_ACTION })).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: GOOD_TROUBLE_PURCHASE_VERIFY_ACTION }));

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: GOOD_TROUBLE_PURCHASE_VERIFY_ACTION }).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("Back to verification options")).toBeNull();
  });

  it("asks the holder to sign in again after session loss without exposing wallet copy", async () => {
    mockAuthState.suiAddress = null;
    mockAuthState.isLoading = false;
    mockSearchParams = new URLSearchParams({
      verify_request: "vr-session",
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
    });
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/v1/verification-requests/vr-session")) {
        return new Response(JSON.stringify({
          partner_id: GOOD_TROUBLE_PARTNER_ID,
          policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
        }), { status: 200 });
      }
      if (url.includes("continue-binding") || url.includes("method-qualification")) {
        return new Response(JSON.stringify({ ok: true, method_qualified: false }), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;
    const { container } = render(<PartnerContinueClient />);
    await waitFor(() => {
      expect(screen.getByText(/Sign in to continue/i)).toBeTruthy();
    });
    expect(container.textContent).not.toMatch(/0xabc|receipt_id|jwt /i);
  });
});
