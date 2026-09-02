// @vitest-environment jsdom
// FILE: components/partner/PartnerVerifyClient.test.tsx

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { PartnerVerifyClient } from "./PartnerVerifyClient";

const mockEvaluate = vi.fn();
const mockEnsureBrowserSession = vi.fn();
const mockSignIn = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams({
    partner_id: "good-trouble-cannabis",
    policy_id: "good-trouble-retail-v1",
    return_url: "https://www.goodtroublecanna.com/age-verification-result?gtv=gtv_test123",
  }),
}));

vi.mock("@/components/sui/SuiAuthProvider", () => ({
  useSuiAuth: () => ({
    suiAddress: "0xabc",
    isLoading: false,
  }),
}));

vi.mock("@/lib/auth/ensureBrowserSession", () => ({
  ensureBrowserSession: (...args: unknown[]) => mockEnsureBrowserSession(...args),
}));

vi.mock("@/lib/hooks/useGoogleSignIn", () => ({
  useGoogleSignIn: () => ({
    signIn: mockSignIn,
    busy: false,
    configured: true,
    disabled: false,
    error: null,
  }),
}));

describe("PartnerVerifyClient auth/session gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/v1/partner-flow/evaluate")) {
        return mockEvaluate(init);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;
  });

  afterEach(() => {
    cleanup();
  });

  it("shows sign-in prompt when browser session is missing", async () => {
    mockEnsureBrowserSession.mockResolvedValue({ ok: false, error: "Sign in again — OAuth session expired" });

    render(<PartnerVerifyClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sign in with Google/i })).toBeTruthy();
      expect(screen.getAllByText("Sign in to continue with Abraxas.").length).toBeGreaterThan(0);
    });
    expect(mockEvaluate).not.toHaveBeenCalled();
  });

  it("resumes partner flow after browser session is established", async () => {
    mockEnsureBrowserSession.mockResolvedValue({ ok: true });
    mockEvaluate.mockResolvedValue(new Response(JSON.stringify({
      next: "enter",
      redirect_url: "https://www.goodtroublecanna.com/age-verification-result?gtv=gtv_test123&receipt_id=dr_test",
    }), { status: 200 }));

    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, href: "" },
    });

    render(<PartnerVerifyClient />);

    await waitFor(() => {
      expect(mockEnsureBrowserSession).toHaveBeenCalledWith("0xabc");
      expect(mockEvaluate).toHaveBeenCalled();
    });

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("maps evaluate 401 to sign-in instead of a reload loop", async () => {
    mockEnsureBrowserSession.mockResolvedValue({ ok: true });
    mockEvaluate.mockResolvedValue(new Response(JSON.stringify({
      error: "Sign in required in this browser",
    }), { status: 401 }));

    render(<PartnerVerifyClient />);

    await waitFor(() => {
      expect(screen.getAllByText("Sign in to continue with Abraxas.").length).toBeGreaterThan(0);
      expect(screen.queryByText("Sign in required in this browser")).toBeNull();
    });
  });
});
