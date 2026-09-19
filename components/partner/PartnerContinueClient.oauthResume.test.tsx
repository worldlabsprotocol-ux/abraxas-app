// @vitest-environment jsdom
// FILE: components/partner/PartnerContinueClient.oauthResume.test.tsx
// Regression: OAuth activate continue URLs omit return; Continue must not bounce to bare /partner/verify.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { PartnerContinueClient } from "./PartnerContinueClient";
import { PartnerVerifyClient } from "./PartnerVerifyClient";
import { partnerVerifyMissingRequiredParametersMessage } from "@/lib/partner/normalizePartnerVerifyInput";

const ECONOMIC_POLICY_ID = "circle-arc-demo-304-sandbox_economic_demo-v1";
const ECONOMIC_PARTNER_ID = "circle-arc-demo-304";
const VERIFY_REQUEST_ID = "vr-oauth-resume-1";

const mockComplete = vi.fn();
const mockEnsureReady = vi.fn();
const mockLoadSession = vi.fn();
const mockParseToken = vi.fn();
const mockClearLogin = vi.fn();
const mockClearStale = vi.fn();
const mockClearResume = vi.fn();
const mockSignInWithGoogle = vi.fn();
const mockHandoffComplete = vi.fn();

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/components/sui/SuiAuthProvider", () => ({
  useSuiAuth: () => ({
    suiAddress: "0xabc",
    isLoading: false,
    session: { email: "holder@example.com" },
    signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args),
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
    complete: mockHandoffComplete,
  }),
}));

vi.mock("@/lib/sui/zklogin/completeLogin", () => ({
  completeGoogleZkLogin: (...args: unknown[]) => mockComplete(...args),
}));

vi.mock("@/lib/auth/ensureBrowserSession", () => ({
  ensureBrowserSessionReady: (...args: unknown[]) => mockEnsureReady(...args),
}));

vi.mock("@/lib/sui/zklogin/session", () => ({
  loadUserSession: () => mockLoadSession(),
  parseIdTokenFromCallbackHash: (...args: unknown[]) => mockParseToken(...args),
}));

vi.mock("@/lib/partner/partnerVerifyResume", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/partner/partnerVerifyResume")>();
  return {
    ...actual,
    clearPartnerVerifyResume: () => mockClearResume(),
  };
});

vi.mock("@/lib/sui/zklogin/loginInFlight", () => ({
  clearLoginInFlight: () => mockClearLogin(),
  clearStaleLoginInFlight: () => mockClearStale(),
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

function continueParamsFromPath(path: string): URLSearchParams {
  const query = path.includes("?") ? path.slice(path.indexOf("?") + 1) : "";
  return new URLSearchParams(query);
}

describe("OAuth callback must not land on bare /partner/verify", () => {
  let completePartnerVerifyOAuthCallback: typeof import("@/lib/partner/partnerVerifyOAuthCallback").completePartnerVerifyOAuthCallback;
  let replaceSpy: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    ({ completePartnerVerifyOAuthCallback } = await import("@/lib/partner/partnerVerifyOAuthCallback"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadSession.mockReturnValue(null);
    mockParseToken.mockReturnValue("id-token");
    mockComplete.mockResolvedValue({ suiAddress: "0xabc" });
    mockEnsureReady.mockResolvedValue({ ok: true });
    mockSearchParams = new URLSearchParams();
    replaceSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, replace: replaceSpy, hash: "#id_token=test" },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("reproduces the Preview failure: bare /partner/verify after activate omit-return, then stays on continue", async () => {
    const continuePath = `/partner/continue?verify_request=${VERIFY_REQUEST_ID}&partner_id=${ECONOMIC_PARTNER_ID}&policy_id=${ECONOMIC_POLICY_ID}`;
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/v1/partner-verify/resume/activate") && init?.method === "POST") {
        return new Response(JSON.stringify({
          ok: true,
          issuedReceipt: false,
          continuePath,
        }), { status: 200 });
      }
      if (url.includes(`/api/v1/verification-requests/${VERIFY_REQUEST_ID}`)) {
        return new Response(JSON.stringify({
          partner_id: ECONOMIC_PARTNER_ID,
          policy_id: ECONOMIC_POLICY_ID,
          purpose: "sandbox_economic_demo",
          claim_labels: [],
        }), { status: 200 });
      }
      if (url.includes("/api/v1/partner-verify/continue-binding")) {
        return new Response(JSON.stringify({
          ok: true,
          partner_id: ECONOMIC_PARTNER_ID,
          policy_id: ECONOMIC_POLICY_ID,
          purpose: "sandbox_economic_demo",
          return_url: "https://partner.example/callback",
        }), { status: 200 });
      }
      if (url.includes("/api/age-assurance/providers")) {
        return new Response(JSON.stringify({
          providers: [{ id: "demo", displayName: "Partner-provided eligibility check", configured: true }],
          existing_proof: { eligible_for_reuse: false },
        }), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const oauth = await completePartnerVerifyOAuthCallback("#id_token=test");
    expect(oauth.redirectPath).toBe(continuePath);
    expect(oauth.redirectPath).not.toContain("return");
    expect(oauth.redirectPath).not.toContain("receipt");

    mockSearchParams = new URLSearchParams();
    render(<PartnerVerifyClient />);
    const observedBareVerifyMessage = partnerVerifyMissingRequiredParametersMessage([
      "partner identifier",
      "return URL",
    ]);
    await waitFor(() => {
      expect(screen.getAllByText(observedBareVerifyMessage).length).toBeGreaterThan(0);
    });
    cleanup();

    mockSearchParams = continueParamsFromPath(oauth.redirectPath);
    expect(mockSearchParams.get("return")).toBeNull();
    expect(mockSearchParams.get("verify_request")).toBe(VERIFY_REQUEST_ID);
    expect(mockSearchParams.get("partner_id")).toBe(ECONOMIC_PARTNER_ID);
    expect(mockSearchParams.get("policy_id")).toBe(ECONOMIC_POLICY_ID);

    render(<PartnerContinueClient />);

    await waitFor(() => {
      expect(screen.getByText(/Choose how to satisfy this requirement/i)).toBeTruthy();
    });
    expect(screen.getByText(/Sandbox \/ testnet economic demo only/i)).toBeTruthy();
    expect(screen.queryByText(/This verification link is missing required parameters/i)).toBeNull();
    expect(replaceSpy).not.toHaveBeenCalledWith("/partner/verify");
    expect(replaceSpy.mock.calls.every((call) => call[0] !== "/partner/verify")).toBe(true);
  });

  it("fails closed on continue when verify request is missing after sign-in, without navigating to bare verify", async () => {
    mockSearchParams = new URLSearchParams({
      partner_id: ECONOMIC_PARTNER_ID,
      policy_id: ECONOMIC_POLICY_ID,
    });
    global.fetch = vi.fn() as typeof fetch;

    render(<PartnerContinueClient />);

    const closed = partnerVerifyMissingRequiredParametersMessage(["verification request"]);
    await waitFor(() => {
      expect(screen.getAllByText(closed).length).toBeGreaterThan(0);
    });
    expect(replaceSpy).not.toHaveBeenCalledWith("/partner/verify");
  });
});
