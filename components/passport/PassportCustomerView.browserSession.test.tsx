// @vitest-environment jsdom
// FILE: components/passport/PassportCustomerView.browserSession.test.tsx
// Cached zkLogin address without HttpOnly browser session must reauth before repair.

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PassportCustomerView } from "./PassportCustomerView";
import { computePassportSetupState } from "@/lib/idv/identityVerificationStates";
import { IDLE_PARTNER_FLOW_HANDOFF } from "@/lib/passport/partnerFlowHandoff";
import { BROWSER_SESSION_AUTH_ERROR } from "@/lib/passport/passportBrowserSessionAuth";
import { PASSPORT_REAUTH_LABEL } from "@/lib/passport/passportCustomerCopy";

const SUI = "0x" + "a".repeat(64);

const setup = computePassportSetupState({
  walletDone: true,
  identityStatus: "not_started",
  credentialStatus: "not_issued",
  walletBindingL3: false,
});

const baseProps = {
  walletDone: true,
  authLoading: false,
  suiAddress: SUI,
  email: "holder@example.com",
  setup,
  identityStatus: "not_started" as const,
  credential: null,
  via: null,
  starting: false,
  error: null,
  idvProvider: "manual" as const,
  veriffConfigured: false,
  onStartIdCheck: vi.fn(),
  onRefresh: vi.fn(),
  onWalletBound: vi.fn(),
  handoff: IDLE_PARTNER_FLOW_HANDOFF,
};

const signInMock = vi.fn();

vi.mock("@/lib/hooks/useGoogleSignIn", () => ({
  useGoogleSignIn: () => ({
    signIn: signInMock,
    signInExistingAccount: vi.fn(),
    busy: false,
    legacyBusy: false,
    configured: true,
    legacyRecoveryConfigured: false,
    disabled: false,
    legacyDisabled: false,
  }),
}));

function renderPassportCustomerView(props = baseProps) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<PassportCustomerView {...props} />, { wrapper });
}

function mockFetchSequence(handlers: Array<(url: string, init?: RequestInit) => Response | Promise<Response>>) {
  let call = 0;
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const handler = handlers[Math.min(call, handlers.length - 1)];
    call += 1;
    return handler(url, init);
  });
}

describe("PassportCustomerView browser session gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows reauthentication UI when local address exists but browser session is missing", async () => {
    const fetchMock = mockFetchSequence([
      () => new Response(JSON.stringify({ ok: false }), { status: 401 }),
      () => new Response(JSON.stringify({ error: "Invalid or expired id_token" }), { status: 401 }),
    ]);
    vi.stubGlobal("fetch", fetchMock);

    renderPassportCustomerView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: PASSPORT_REAUTH_LABEL })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Confirm securely/i })).not.toBeInTheDocument();
  });

  it("shows Confirm securely only after browser session is authenticated", async () => {
    const fetchMock = mockFetchSequence([
      () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    ]);
    vi.stubGlobal("fetch", fetchMock);

    renderPassportCustomerView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Confirm securely/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: PASSPORT_REAUTH_LABEL })).not.toBeInTheDocument();
  });

  it("switches to reauthentication when repair returns 401", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/auth/browser-session")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url.includes("/api/wallet-authority/repair")) {
        return new Response(JSON.stringify({ ok: false, error: BROWSER_SESSION_AUTH_ERROR }), { status: 401 });
      }
      return new Response("{}", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPassportCustomerView();

    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Confirm securely/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Confirm securely/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: PASSPORT_REAUTH_LABEL })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Confirm securely/i })).not.toBeInTheDocument();
  });

  it("repairs binding after session is restored and calls onWalletBound", async () => {
    let sessionReady = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/auth/browser-session") && !url.includes("DELETE")) {
        if (!sessionReady) {
          return new Response(JSON.stringify({ ok: false }), { status: 401 });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url.includes("/api/auth/browser-session") && url.endsWith("/api/auth/browser-session")) {
        return new Response(JSON.stringify({ ok: sessionReady }), { status: sessionReady ? 200 : 401 });
      }
      if (url.includes("/api/wallet-authority/repair")) {
        return new Response(JSON.stringify({ ok: true, wallet_binding_status: "repaired" }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "Invalid or expired id_token" }), { status: 401 });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPassportCustomerView();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: PASSPORT_REAUTH_LABEL })).toBeInTheDocument();
    });

    sessionReady = true;
    signInMock.mockImplementation(async () => {
      window.dispatchEvent(new Event("abraxas:zklogin-session"));
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: PASSPORT_REAUTH_LABEL }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Confirm securely/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Confirm securely/i }));

    await waitFor(() => {
      expect(baseProps.onWalletBound).toHaveBeenCalled();
    });
  });
});
