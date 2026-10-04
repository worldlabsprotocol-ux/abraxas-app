// @vitest-environment jsdom
// FILE: components/passport/PassportWalletsSection.test.tsx

import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PassportWalletsSection } from "@/components/passport/PassportWalletsSection";

vi.mock("@/lib/walletAuthority/client/useBindEvmWallet", () => ({
  useBindEvmWallet: () => ({
    bindInjected: vi.fn(),
    bindWalletConnect: vi.fn(),
    loading: false,
    error: null,
    result: null,
    uiState: { showInjected: true, showWalletConnect: false, blockedHint: null },
  }),
}));

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PassportWalletsSection />
    </QueryClientProvider>,
  );
}

describe("PassportWalletsSection", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/wallet-authority/wallets")) {
        return new Response(JSON.stringify({ wallets: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;
  });

  it("renders empty-state guidance without portfolio language", async () => {
    renderSection();
    expect(await screen.findByText(/Wallets you chose to prove/i)).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText(/does not discover wallets automatically/i)).toBeTruthy();
    });
    expect(screen.queryByText(/balance/i)).toBeNull();
    expect(screen.queryByText(/portfolio/i)).toBeNull();
  });

  it("explains connected does not equal shared", async () => {
    renderSection();
    await waitFor(() => {
      expect(screen.getAllByText(/does not automatically share it with applications/i).length).toBeGreaterThan(0);
    });
  });
});
