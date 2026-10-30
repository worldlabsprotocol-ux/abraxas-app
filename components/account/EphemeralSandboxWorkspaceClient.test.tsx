// FILE: components/account/EphemeralSandboxWorkspaceClient.test.tsx
/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EphemeralSandboxWorkspaceClient } from "./EphemeralSandboxWorkspaceClient";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { readHomeBuilderDiscoveryIntent, writeHomeBuilderDiscoveryIntent } from "@/lib/home/homeBuilderDiscovery";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }), useSearchParams: () => new URLSearchParams() }));

vi.mock("@/components/developers/EmbeddedIntegrationStudioPanel", () => ({ EmbeddedIntegrationStudioPanel: () => null }));

vi.mock("@solana/wallet-adapter-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/wallet-adapter-react")>();
  return {
    ...actual,
    useWallet: () => ({
      publicKey: null,
      signMessage: undefined,
      connected: false,
      connecting: false,
      connect: vi.fn(),
      select: vi.fn(),
      wallet: null,
      wallets: [],
      disconnect: vi.fn(),
    }),
  };
});

describe("EphemeralSandboxWorkspaceClient", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/auth/wallet/enabled")) { return new Response(JSON.stringify({ operational: true }), { status: 200 }); }
        if (url.includes("/api/auth/wallet/session")) {
          return new Response(
            JSON.stringify({
              authenticated: true,
              session_id: "sess_test_123",
              wallet_address: "Abcd1234WalletAddressExample111111111111",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.includes("/api/auth/wallet/sandbox/workspace")) {
          return new Response(JSON.stringify({ ok: true, workspace: null }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/auth/wallet/sandbox/policies")) {
          return new Response(
            JSON.stringify({
              policies: [
                { policy_id: "wallet_control", label: "Wallet Control", description: "Confirm wallet control." },
                { policy_id: "age_21_retail", label: "Age 21 eligibility", description: "Age 21 sandbox demonstration." },
              ],
              availability: [
                { policy_id: "wallet_control", can_request_verification: true, availability_label: "Ready" },
                { policy_id: "age_21_retail", can_request_verification: false, availability_label: "Unavailable", availability_detail: "Issuer evidence required." },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.includes("/api/auth/wallet/sandbox/enter")) {
          return new Response(
            JSON.stringify({
              ok: true,
              workspace: {
                workspace_id: "esbx_test_workspace",
                expires_at: new Date(Date.now() + 3600_000).toISOString(),
              },
              correlation_id: "esbx_req_test",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({}), { status: 404 });
      }),
    );
  });

  it("resumes the selected policy after a new-tab wallet sign-in and changes it only by choice", async () => {
    writeHomeBuilderDiscoveryIntent({ platform: "website", policyPackId: "wallet_control" });
    window.sessionStorage.clear();
    render(
      <WalletContextProvider>
        <EphemeralSandboxWorkspaceClient surface="homepage" />
      </WalletContextProvider>,
    );

    await waitFor(() => expect(screen.getByText("Your test configuration")).toBeTruthy());
    expect(screen.getByRole("heading", { name: "Wallet Control" })).toBeTruthy();
    expect(screen.queryByRole("radiogroup", { name: "Choose a policy" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Change policy" }));
    expect(screen.getByRole("radiogroup", { name: "Choose a policy" })).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: /Age 21 eligibility/i }));
    expect(screen.getByRole("heading", { name: "Age 21 eligibility" })).toBeTruthy();
    expect(readHomeBuilderDiscoveryIntent()?.policyPackId).toBe("age_21_retail");
    expect(screen.getByText(/Issuer evidence required/i)).toBeTruthy();
  });

  it("opens a workspace without a second wallet action signature", async () => {
    render(
      <WalletContextProvider>
        <EphemeralSandboxWorkspaceClient />
      </WalletContextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("radiogroup", { name: "Choose a policy" })).toBeTruthy();
    });
  });
});
