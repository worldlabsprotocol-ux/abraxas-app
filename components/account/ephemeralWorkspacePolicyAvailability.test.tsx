// FILE: components/account/ephemeralWorkspacePolicyAvailability.test.tsx
/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EphemeralSandboxWorkspaceClient } from "./EphemeralSandboxWorkspaceClient";
import { WalletContextProvider } from "@/components/WalletContextProvider";

vi.mock("@solana/wallet-adapter-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/wallet-adapter-react")>();
  return {
    ...actual,
    useWallet: () => ({
      publicKey: { toBase58: () => "Abcd1234WalletAddressExample111111111111" },
      signMessage: vi.fn(),
      connected: true,
      connecting: false,
      connect: vi.fn(),
      select: vi.fn(),
      wallet: { adapter: { name: "Phantom" } },
      wallets: [],
      disconnect: vi.fn(),
    }),
  };
});

describe("EphemeralSandboxWorkspaceClient policy availability", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
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
          return new Response(
            JSON.stringify({
              ok: true,
              workspace: {
                workspace_id: "esbx_test_workspace",
                expires_at: new Date(Date.now() + 3600_000).toISOString(),
              },
            }),
            { status: 200 },
          );
        }
        if (url.includes("/api/auth/wallet/sandbox/policies")) {
          return new Response(
            JSON.stringify({
              policies: [
                { policy_id: "wallet_control", label: "Wallet Control", description: "Ready" },
                { policy_id: "age_21_retail", label: "Age 21", description: "Needs issuer" },
              ],
              availability: [
                {
                  policy_id: "wallet_control",
                  execution_status: "ready",
                  availability_label: "Ready to test",
                  availability_detail: "Ready",
                  can_request_verification: true,
                },
                {
                  policy_id: "age_21_retail",
                  execution_status: "evidence_unavailable",
                  availability_label: "Requires eligible issuer evidence",
                  availability_detail: "Issuer evidence unavailable in sandbox.",
                  can_request_verification: false,
                },
              ],
            }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({}), { status: 404 });
      }),
    );
  });

  it("disables review for Age 21 when issuer evidence is unavailable", async () => {
    render(
      <WalletContextProvider>
        <EphemeralSandboxWorkspaceClient />
      </WalletContextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Choose a policy/i)).toBeTruthy();
    });

    const ageCard = screen.getAllByRole("radio").find((el) => el.textContent?.includes("Age 21"));
    expect(ageCard).toBeTruthy();
    fireEvent.click(ageCard!);

    const reviewBtn = screen.getByRole("button", { name: /Review request/i });
    expect(reviewBtn.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/Issuer evidence unavailable/i)).toBeTruthy();
  });
});
