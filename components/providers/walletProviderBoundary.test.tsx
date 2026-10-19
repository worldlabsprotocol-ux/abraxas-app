// FILE: components/providers/walletProviderBoundary.test.tsx
/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "@/components/providers/AppProviders";
import { PublicNavConnectButton } from "@/components/nav/PublicNavConnectButton";
import { useWallet } from "@solana/wallet-adapter-react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function WalletConsumerProbe() {
  const { wallets } = useWallet();
  return <span data-testid="wallet-count">{wallets.length}</span>;
}

describe("Solana wallet provider boundary (production layout)", () => {
  const walletContextErrors: string[] = [];
  const originalError = console.error;

  beforeEach(() => {
    walletContextErrors.length = 0;
    console.error = (...args: unknown[]) => {
      const text = args.map(String).join(" ");
      if (text.includes("WalletContext")) walletContextErrors.push(text);
      originalError(...args);
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/auth/native/enabled")) {
          return new Response(
            JSON.stringify({ enabled: true, operational: true, auth_mode: "ephemeral_wallet" }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.includes("/api/auth/wallet/session")) {
          return new Response(JSON.stringify({ authenticated: false }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({}), { status: 404 });
      }),
    );
  });

  afterEach(() => {
    console.error = originalError;
    cleanup();
    vi.unstubAllGlobals();
  });

  it("mounts public nav sign-in under AppProviders without missing WalletContext errors", async () => {
    render(
      <AppProviders>
        <PublicNavConnectButton prominent />
        <WalletConsumerProbe />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sign in with Solana wallet/i })).toBeTruthy();
    });

    expect(walletContextErrors).toEqual([]);
    expect(Number(screen.getByTestId("wallet-count").textContent)).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Sign in with Solana wallet/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    expect(walletContextErrors).toEqual([]);
    expect(screen.getByRole("heading", { name: /Connect your wallet/i })).toBeTruthy();
  });

  it("keeps wallet adapters listed after rerender (provider not remounted)", async () => {
    const { rerender } = render(
      <AppProviders>
        <WalletConsumerProbe />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(Number(screen.getByTestId("wallet-count").textContent)).toBeGreaterThan(0);
    });

    rerender(
      <AppProviders>
        <WalletConsumerProbe />
        <span data-testid="extra">ok</span>
      </AppProviders>,
    );

    expect(Number(screen.getByTestId("wallet-count").textContent)).toBeGreaterThan(0);
    expect(walletContextErrors).toEqual([]);
  });
});
