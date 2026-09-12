// @vitest-environment jsdom
// FILE: components/partner/PartnerVerifyClient.test.tsx

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import { GOOD_TROUBLE_BROWSE_SIGN_IN_BUTTON } from "@/lib/partner/goodTroubleBrowseFlow";
import { PartnerVerifyClient } from "./PartnerVerifyClient";

const mockEnsureReady = vi.fn();
const mockSignInWithGoogle = vi.fn();
const mockEvaluateResponse = vi.fn();
const mockAuthState = {
  suiAddress: "0xabc" as string | null,
  isLoading: false,
};

let mockSearchParams = new URLSearchParams({
  partner_id: GOOD_TROUBLE_PARTNER_ID,
  policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
  return_url: "https://www.goodtroublecanna.com/age-verification-result?gtv=gtv_test123",
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/components/sui/SuiAuthProvider", () => ({
  useSuiAuth: () => ({
    suiAddress: mockAuthState.suiAddress,
    isLoading: mockAuthState.isLoading,
    signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args),
  }),
}));

vi.mock("@/lib/auth/ensureBrowserSession", () => ({
  ensureBrowserSessionReady: (...args: unknown[]) => mockEnsureReady(...args),
}));

vi.mock("@/lib/hooks/useGoogleSignIn", () => ({
  useGoogleSignIn: () => ({
    signIn: vi.fn(),
    busy: false,
    configured: true,
    disabled: false,
    error: null,
  }),
}));

describe("PartnerVerifyClient auth/session gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.suiAddress = "0xabc";
    mockAuthState.isLoading = false;
    mockSearchParams = new URLSearchParams({
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
      return_url: "https://www.goodtroublecanna.com/age-verification-result?gtv=gtv_test123",
    });
    sessionStorage.clear();
    mockEnsureReady.mockResolvedValue({ ok: true });
    mockSignInWithGoogle.mockResolvedValue(true);
    mockEvaluateResponse.mockResolvedValue(new Response(JSON.stringify({
      next: "enter",
      redirect_url: "https://www.goodtroublecanna.com/age-verification-result?gtv=gtv_test123&receipt_id=dr_test",
    }), { status: 200 }));

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/v1/partner-flow/evaluate")) {
        return mockEvaluateResponse();
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;
  });

  afterEach(() => {
    cleanup();
  });

  it("auto-evaluates when browser session is ready", async () => {
    render(<PartnerVerifyClient />);

    await waitFor(() => {
      expect(mockEnsureReady).toHaveBeenCalledWith("0xabc");
      expect(mockEvaluateResponse).toHaveBeenCalled();
    });
  });

  it("shows institutional sign-in when browser session is missing", async () => {
    mockEnsureReady.mockResolvedValue({ ok: false, error: "expired" });

    render(<PartnerVerifyClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeTruthy();
    });
    expect(mockEvaluateResponse).not.toHaveBeenCalled();
  });

  it("starts OAuth only once per click", async () => {
    mockEnsureReady.mockResolvedValue({ ok: false });
    render(<PartnerVerifyClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeTruthy();
    });

    const button = screen.getByRole("button", { name: /Continue with Google/i });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    });
  });

  it("resumes automatically after oauth return query flag", async () => {
    window.history.replaceState(null, "", "/partner/verify?partner_id=good-trouble-cannabis&policy_id=good-trouble-retail-v1&return_url=https%3A%2F%2Fwww.goodtroublecanna.com%2Fage-verification-result%3Fgtv%3Dgtv_test123&partner_auth=ready");

    render(<PartnerVerifyClient />);

    await waitFor(() => {
      expect(mockEnsureReady).toHaveBeenCalled();
      expect(mockEvaluateResponse).toHaveBeenCalled();
    });
    expect(window.location.search.includes("partner_auth=ready")).toBe(false);
  });

  it("does not show raw backend auth errors", async () => {
    mockEvaluateResponse.mockResolvedValue(new Response(JSON.stringify({
      error: "Sign in required in this browser",
    }), { status: 401 }));

    render(<PartnerVerifyClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeTruthy();
      expect(screen.queryByText("Sign in required in this browser")).toBeNull();
    });
  });

  it("ignores preview controls when server gate passes disabled props", async () => {
    mockEnsureReady.mockResolvedValue({ ok: false });

    render(<PartnerVerifyClient previewPhase={null} previewSignInConfigured={false} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeTruthy();
    });
    expect(screen.queryByRole("button", { name: /Signing you in/i })).toBeNull();
  });

  it("applies preview phase only from server-provided props", () => {
    mockAuthState.suiAddress = null;
    render(<PartnerVerifyClient previewPhase="signing_in" previewSignInConfigured />);
    expect(screen.getByRole("button", { name: /Signing you in/i })).toBeTruthy();
  });
});

describe("PartnerVerifyClient Good Trouble DOB-first browse sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.suiAddress = null;
    mockAuthState.isLoading = false;
    mockSearchParams = new URLSearchParams({
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
      return_url: "https://www.goodtroublecanna.com/browse-verification-result",
    });
    mockSignInWithGoogle.mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
  });

  it("shows Passport value copy for the exact Good Trouble browse tuple", async () => {
    render(<PartnerVerifyClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: GOOD_TROUBLE_BROWSE_SIGN_IN_BUTTON })).toBeTruthy();
    });
    expect(screen.getByText(/Create a private Passport for faster future access/i)).toBeTruthy();
    expect(screen.queryByText(/Signing in is not age verification/i)).toBeNull();
  });

  it("starts OAuth only once per click on the Passport button", async () => {
    render(<PartnerVerifyClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: GOOD_TROUBLE_BROWSE_SIGN_IN_BUTTON })).toBeTruthy();
    });

    const button = screen.getByRole("button", { name: GOOD_TROUBLE_BROWSE_SIGN_IN_BUTTON });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    });
  });

  it("does not show DOB-first sign-in copy for retail policy with browse purpose", async () => {
    mockSearchParams = new URLSearchParams({
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
      purpose: "browse",
      return_url: "https://www.goodtroublecanna.com/age-verification-result?gtv=gtv_test123",
    });

    render(<PartnerVerifyClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeTruthy();
    });
    expect(screen.queryByText(/Create a private Passport for faster future access/i)).toBeNull();
    expect(screen.getByText(/Signing in is not age verification/i)).toBeTruthy();
  });
});
