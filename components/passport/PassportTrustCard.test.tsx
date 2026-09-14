// @vitest-environment jsdom
// FILE: components/passport/PassportTrustCard.test.tsx

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PassportTrustCard } from "./PassportTrustCard";

const SUI = "0x" + "d".repeat(64);

const mockFetchTrustStatus = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock("@/lib/api/passport", () => ({
  fetchTrustStatus: (...args: unknown[]) => mockFetchTrustStatus(...args),
  passportQueryKeys: {
    trust: (sui: string) => ["passport", "trust", sui],
  },
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
    }),
  };
});

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PassportTrustCard suiAddress={SUI} />
    </QueryClientProvider>,
  );
}

describe("PassportTrustCard wallet repair UX", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    mockInvalidateQueries.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does not show repair when wallet binding status is unavailable", async () => {
    mockFetchTrustStatus.mockResolvedValue({
      wallet_binding_persisted: false,
      wallet_binding_status: "unavailable",
      enhanced_trust: false,
      identity: { status: "not_started" },
      credential: { active: false },
      on_chain: { provisioned: false, stamps_complete: false },
      intent: { proofs_count: 0 },
    });

    renderCard();

    await waitFor(() => {
      expect(screen.getByText("Wallet status temporarily unavailable")).toBeTruthy();
    });
    expect(screen.queryByRole("button", { name: /Repair wallet binding/i })).toBeNull();
  });

  it("shows repair error and keeps retry available after failed repair", async () => {
    mockFetchTrustStatus.mockResolvedValue({
      wallet_binding_persisted: false,
      wallet_binding_status: "missing",
      enhanced_trust: false,
      identity: { status: "not_started" },
      credential: { active: false },
      on_chain: { provisioned: false, stamps_complete: false },
      intent: { proofs_count: 0 },
    });
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, error: "Repair failed" }),
    });

    renderCard();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Repair wallet binding/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Repair wallet binding/i }));

    await waitFor(() => {
      expect(screen.getByText("Repair failed")).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: /Repair wallet binding/i })).toBeTruthy();
  });

  it("refreshes trust query after successful repair", async () => {
    mockFetchTrustStatus.mockResolvedValue({
      wallet_binding_persisted: false,
      wallet_binding_status: "missing",
      enhanced_trust: false,
      identity: { status: "not_started" },
      credential: { active: false },
      on_chain: { provisioned: false, stamps_complete: false },
      intent: { proofs_count: 0 },
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, wallet_binding_status: "repaired" }),
    });

    renderCard();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Repair wallet binding/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Repair wallet binding/i }));

    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["passport", "trust", SUI],
      });
    });
    expect(screen.queryByText("Repair failed")).toBeNull();
  });
});
