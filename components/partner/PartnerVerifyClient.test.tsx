// @vitest-environment jsdom
// FILE: components/partner/PartnerVerifyClient.test.tsx

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { PartnerVerifyClient } from "./PartnerVerifyClient";

const mockEnsureReady = vi.fn();
const mockSignInWithGoogle = vi.fn();
const mockEvaluateResponse = vi.fn();
const mockAuthState = {
  suiAddress: "0xabc" as string | null,
  isLoading: false,
};

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams({
    partner_id: "good-trouble-cannabis",
    policy_id: "good-trouble-retail-v1",
    return_url: "https://www.goodtroublecanna.com/age-verification-result?gtv=gtv_test123",
  }),
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
