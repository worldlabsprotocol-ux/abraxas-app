// FILE: components/account/ephemeralWorkspaceSigningRecovery.test.tsx
/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EphemeralSandboxWorkspaceClient } from "./EphemeralSandboxWorkspaceClient";
import { WalletContextProvider } from "@/components/WalletContextProvider";

const signMessage = vi.fn();

vi.mock("@solana/wallet-adapter-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/wallet-adapter-react")>();
  return {
    ...actual,
    useWallet: () => ({
      publicKey: { toBase58: () => "Abcd1234WalletAddressExample111111111111" },
      signMessage,
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

describe("EphemeralSandboxWorkspaceClient signing recovery", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    signMessage.mockReset();
  });

  let challengeFetchCount = 0;
  let testVerifyCalls = 0;

  beforeEach(() => {
    challengeFetchCount = 0;
    testVerifyCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/auth/wallet/enabled")) {
          return Response.json({ operational: true, config_ok: true });
        }
        if (url.includes("/api/auth/wallet/session")) {
          return Response.json({
            authenticated: true,
            session_id: "sess_test_123",
            wallet_address: "Abcd1234WalletAddressExample111111111111",
          });
        }
        if (url.includes("/api/auth/wallet/sandbox/workspace")) {
          return Response.json({
            ok: true,
            workspace: {
              workspace_id: "esbx_test_workspace",
              expires_at: new Date(Date.now() + 3600_000).toISOString(),
            },
          });
        }
        if (url.includes("/api/auth/wallet/sandbox/policies")) {
          return Response.json({
            policies: [{ policy_id: "wallet_control", label: "Wallet Control", description: "" }],
            availability: [
              {
                policy_id: "wallet_control",
                execution_status: "ready",
                availability_label: "Ready",
                availability_detail: "Ready",
                can_request_verification: true,
              },
            ],
          });
        }
        if (url.includes("/api/auth/wallet/solana/action/challenge") && init?.method === "POST") {
          challengeFetchCount += 1;
          return Response.json({
            ok: true,
            challenge: {
              challenge_id: `ewac_test_challenge_${challengeFetchCount}`,
              message: `scoped verification message ${challengeFetchCount}`,
              expires_at: new Date(Date.now() + 300_000).toISOString(),
              operation: "sandbox:verification:test",
            },
          });
        }
        if (url.includes("/api/auth/wallet/sandbox/test-verify") && init?.method === "POST") {
          testVerifyCalls += 1;
          return Response.json({ ok: true, result: { receipt_id: "dr_late" }, decision: "approved" });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("allows Cancel during pending wallet sign and returns to review without refresh", async () => {
    let resolveSign: ((value: Uint8Array) => void) | null = null;
    signMessage.mockImplementation(
      () =>
        new Promise<Uint8Array>((resolve) => {
          resolveSign = resolve;
        }),
    );

    render(
      <WalletContextProvider>
        <EphemeralSandboxWorkspaceClient />
      </WalletContextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Choose a policy/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Review request/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Verify with Phantom/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Verify with Phantom/i }));

    await waitFor(() => {
      expect(screen.getByText(/Confirm in your wallet/i)).toBeTruthy();
    });

    const cancelBtn = screen.getByRole("button", { name: /^Cancel$/i });
    expect(cancelBtn.hasAttribute("disabled")).toBe(false);

    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Verify with Phantom/i })).toBeTruthy();
    });

    expect(signMessage).toHaveBeenCalledTimes(1);
    resolveSign?.(new Uint8Array([1]));
    await waitFor(() => {
      expect(testVerifyCalls).toBe(0);
    });
  });

  it("Try again fetches a fresh challenge after cancel", async () => {
    signMessage.mockRejectedValue(new Error("User rejected"));

    render(
      <WalletContextProvider>
        <EphemeralSandboxWorkspaceClient />
      </WalletContextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Choose a policy/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Review request/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Verify with Phantom/i })).toBeTruthy();
    });
    expect(challengeFetchCount).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: /Verify with Phantom/i }));
    await waitFor(() => {
      expect(screen.getByText(/Confirm in your wallet/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Try again/i }));
    await waitFor(() => {
      expect(challengeFetchCount).toBe(2);
      expect(screen.getByRole("button", { name: /Verify with Phantom/i })).toBeTruthy();
    });
  });

  it("does not start duplicate concurrent sign prompts on rapid Verify clicks", async () => {
    signMessage.mockImplementation(
      () => new Promise<Uint8Array>(() => {
        /* pending */
      }),
    );

    render(
      <WalletContextProvider>
        <EphemeralSandboxWorkspaceClient />
      </WalletContextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Choose a policy/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Review request/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Verify with Phantom/i })).toBeTruthy();
    });

    const verifyBtn = screen.getByRole("button", { name: /Verify with Phantom/i });
    fireEvent.click(verifyBtn);
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText(/Confirm in your wallet/i)).toBeTruthy();
    });
    expect(signMessage).toHaveBeenCalledTimes(1);
  });

  it("surfaces wallet rejection and offers Try again without refresh", async () => {
    signMessage.mockRejectedValue(new Error("User rejected"));

    render(
      <WalletContextProvider>
        <EphemeralSandboxWorkspaceClient />
      </WalletContextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Choose a policy/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Review request/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Verify with Phantom/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Verify with Phantom/i }));

    await waitFor(() => {
      expect(screen.getByText(/Signature request cancelled/i)).toBeTruthy();
    });

    expect(screen.getByRole("button", { name: /Try again/i })).toBeTruthy();
  });
});
