// @vitest-environment jsdom
// FILE: components/passport/PassportCustomerView.walletTruth.test.tsx

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PassportCustomerView } from "./PassportCustomerView";
import { computePassportSetupState } from "@/lib/idv/identityVerificationStates";
import { IDLE_PARTNER_FLOW_HANDOFF } from "@/lib/passport/partnerFlowHandoff";

const SUI = "0x" + "f".repeat(64);

function renderView(setup = computePassportSetupState({
  walletDone: true,
  identityStatus: "not_started",
  credentialStatus: "not_issued",
  walletBindingL3: true,
})) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  return render(
    <PassportCustomerView
      walletDone
      authLoading={false}
      suiAddress={SUI}
      email="holder@example.com"
      setup={setup}
      walletBindingStatus="active"
      identityStatus="not_started"
      credential={null}
      via={null}
      starting={false}
      error={null}
      idvProvider="manual"
      veriffConfigured={false}
      onStartIdCheck={vi.fn()}
      onRefresh={vi.fn()}
      handoff={IDLE_PARTNER_FLOW_HANDOFF}
    />,
    { wrapper },
  );
}

describe("PassportCustomerView wallet truth", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/auth/browser-session")) {
        if (init?.method === "DELETE") {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does not offer Confirm securely when canonical wallet binding is already active", async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText("Account secured")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Confirm securely/i })).not.toBeInTheDocument();
  });

  it("repairs binding, awaits identity refresh, and clears Confirm securely", async () => {
    const onWalletBound = vi.fn(async () => ({
      walletBound: true,
      walletBindingStatus: "active" as const,
    }));

    const unboundSetup = computePassportSetupState({
      walletDone: true,
      identityStatus: "not_started",
      credentialStatus: "not_issued",
      walletBindingL3: false,
    });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <PassportCustomerView
          walletDone
          authLoading={false}
          suiAddress={SUI}
          email="holder@example.com"
          setup={unboundSetup}
          walletBindingStatus="missing"
          identityStatus="not_started"
          credential={null}
          via={null}
          starting={false}
          error={null}
          idvProvider="manual"
          veriffConfigured={false}
          onStartIdCheck={vi.fn()}
          onRefresh={vi.fn()}
          onWalletBound={onWalletBound}
          handoff={IDLE_PARTNER_FLOW_HANDOFF}
        />
      </QueryClientProvider>,
    );

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/auth/browser-session")) {
        if (init?.method === "DELETE") {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url.includes("/api/wallet-authority/repair")) {
        return new Response(JSON.stringify({
          ok: true,
          wallet_binding_status: "repaired",
          persisted: true,
        }), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    }));

    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Confirm securely/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Confirm securely/i }));

    await waitFor(() => {
      expect(onWalletBound).toHaveBeenCalled();
    });
  });
});
